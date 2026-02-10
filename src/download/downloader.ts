import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pLimit from 'p-limit';
import { chromium, type Browser, type BrowserContext, type Download, type Page } from 'playwright';
import type { Flow, ScreenAsset } from '../types/models.js';
import { chromeProfileDir } from '../auth/profile.js';
import { sanitizeName, ensureDir } from '../utils/fsSafe.js';
import { fetchWithRetry } from '../utils/http.js';

export type DownloadOptions = {
  outDir: string;
  concurrency?: number;
  fallbackConcurrency?: number;
  cookieHeader?: string;
  storageStatePath?: string;
  directTimeoutMs?: number;
  directRetries?: number;
  forceBrowserFallback?: boolean;
  /**
   * If direct image fetching fails (e.g. broken Supabase URLs), fall back to Playwright UI download.
   * Defaults to true.
   */
  browserFallback?: boolean;
  /** Run fallback browser headless. Defaults to true. */
  browserHeadless?: boolean;
};

export type DownloadPerfStats = {
  assetCount: number;
  concurrency: number;
  fallbackConcurrency: number;
  directTimeoutMs: number;
  directRetries: number;
  forceBrowserFallback: boolean;
  totalMs: number;
  directAttempts: number;
  directSuccess: number;
  browserFallbackSuccess: number;
  failed: number;
  directMs: number;
  browserFallbackMs: number;
  avgAssetMs: number;
};

export type DownloadFlowResult = {
  dir: string;
  files: string[];
  metaPath: string;
  stats: DownloadPerfStats;
};

const DEFAULT_DIRECT_DOWNLOAD_TIMEOUT_MS = 15_000;
const DEFAULT_DIRECT_DOWNLOAD_RETRIES = 1;

function flowDir(outDir: string, flow: Flow): string {
  const app = sanitizeName(flow.appName, 'Unknown App');
  const flowName = sanitizeName(flow.flowName, 'Unknown Flow');
  return path.join(outDir, app, flowName);
}

async function downloadOne(
  asset: ScreenAsset,
  destPath: string,
  cookieHeader: string | undefined,
  opts: { timeoutMs: number; retries: number },
) {
  const res = await fetchWithRetry(
    asset.imageUrl,
    {
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        accept: 'image/*,*/*;q=0.8',
      },
    },
    {
      timeoutMs: opts.timeoutMs,
      retries: opts.retries,
      retryDelayMs: 250,
      maxRetryDelayMs: 1_000,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed ${res.status} downloading ${asset.imageUrl}\n${text.slice(0, 300)}`);
  }

  const ctype = res.headers.get('content-type') ?? '';
  if (!ctype.startsWith('image/')) {
    // Often means we received an HTML login page.
    const text = await res.text().catch(() => '');
    throw new Error(
      `Expected image/* but got ${ctype} for ${asset.imageUrl}\n${text.slice(0, 300)}`,
    );
  }

  ensureDir(path.dirname(destPath));
  const file = fs.createWriteStream(destPath);
  if (!res.body) throw new Error('No response body');

  // Node can convert WebStreams -> Node streams for zero-copy-ish piping.
  const nodeReadable = Readable.fromWeb(res.body as any);
  await pipeline(nodeReadable, file);
}

async function dismissOverlays(page: any) {
  // Mobbin occasionally shows overlays/modals that intercept clicks.
  // Be gentle: try Escape, and try clicking a visible Close button.
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
  } catch {
    // ignore
  }

  try {
    const closeBtn = page.getByRole('button', { name: /^close$/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click({ timeout: 1000 });
  } catch {
    // ignore
  }
}

async function clickDownloadAsPng(page: any): Promise<Download> {
  // Mobbin UI path (confirmed): 3-dot menu → "Download png".
  // We'll do exactly that, using robust selectors.

  const label = /download\s*(as\s*)?png/i;

  await dismissOverlays(page);

  // Click the first visible 3-dot menu ("more icon"). In practice this is the screen action menu.
  const moreBtn = page
    .locator('svg:has(title:has-text("more icon"))')
    .first()
    .locator('xpath=ancestor::button[1]');

  await moreBtn.waitFor({ state: 'attached', timeout: 15_000 });
  await moreBtn.click({ force: true, timeout: 10_000 });

  // Menu items are Radix-based. Use role or data-radix as fallback.
  const itemByRole = page.locator('[role="menuitem"]').filter({ hasText: label }).first();
  const itemByRadix = page
    .locator('[data-radix-collection-item]')
    .filter({ hasText: label })
    .first();

  const item = ((await itemByRole.count().catch(() => 0)) > 0 ? itemByRole : itemByRadix);
  await item.waitFor({ state: 'visible', timeout: 15_000 });

  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    item.click({ force: true, timeout: 10_000 }),
  ]);

  return dl;
}

async function downloadViaBrowser(
  page: Page,
  asset: ScreenAsset,
  destPath: string,
): Promise<void> {
  ensureDir(path.dirname(destPath));

  await page.goto(`https://mobbin.com/screens/${asset.screenId}`, { waitUntil: 'domcontentloaded' });
  const download = await clickDownloadAsPng(page);
  // Force filename to our convention.
  await download.saveAs(destPath);
}

export async function downloadFlow(
  flow: Flow,
  assets: ScreenAsset[],
  opts: DownloadOptions,
): Promise<DownloadFlowResult> {
  const startedAt = performance.now();
  const dir = flowDir(opts.outDir, flow);
  ensureDir(dir);

  const metaPath = path.join(dir, 'meta.json');
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        app: flow.appName,
        flow: flow.flowName,
        platform: flow.platform,
        sourceUrl: flow.sourceUrl,
        downloadedAt: new Date().toISOString(),
        screens: assets.map((a) => ({
          index: a.index,
          title: a.title,
          file: `${String(a.index).padStart(2, '0')}.png`,
          sourceImageUrl: a.imageUrl,
        })),
      },
      null,
      2,
    ),
    'utf-8',
  );

  const browserFallback = opts.browserFallback ?? true;
  const browserHeadless = opts.browserHeadless ?? true;
  const concurrency = opts.concurrency ?? 8;
  const forceBrowserFallback = opts.forceBrowserFallback ?? false;
  const fallbackConcurrency =
    opts.fallbackConcurrency ??
    (forceBrowserFallback ? Math.max(1, Math.min(concurrency, 3)) : 1);
  const directTimeoutMs = opts.directTimeoutMs ?? DEFAULT_DIRECT_DOWNLOAD_TIMEOUT_MS;
  const directRetries = opts.directRetries ?? DEFAULT_DIRECT_DOWNLOAD_RETRIES;

  let directAttempts = 0;
  let directSuccess = 0;
  let browserFallbackSuccess = 0;
  let failed = 0;
  let directMs = 0;
  let browserFallbackMs = 0;
  let assetElapsedMs = 0;

  // We'll only spin up Playwright if we actually need it.
  let browserCtx: BrowserContext | null = null;
  let browser: Browser | null = null;
  let browserPage: Page | null = null;
  const getBrowserCtx = async () => {
    if (browserCtx) return browserCtx;

    const launchPersistent = async () =>
      chromium.launchPersistentContext(chromeProfileDir(), {
        headless: browserHeadless,
        channel: 'chrome',
        args: ['--disable-blink-features=AutomationControlled'],
        acceptDownloads: true,
      });

    try {
      // Prefer persistent profile to preserve the most realistic logged-in browser state.
      browserCtx = await launchPersistent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isProfileLock = msg.includes('ProcessSingleton') || msg.includes('SingletonLock');
      if (!isProfileLock || !opts.storageStatePath) throw err;

      // Profile is in use: fall back to an isolated context backed by saved storageState.
      browser = await chromium.launch({
        headless: browserHeadless,
        channel: 'chrome',
        args: ['--disable-blink-features=AutomationControlled'],
      });
      browserCtx = await browser.newContext({
        storageState: opts.storageStatePath,
        acceptDownloads: true,
      });
    }
    return browserCtx;
  };
  const getBrowserPage = async () => {
    if (browserPage) return browserPage;
    const ctx = await getBrowserCtx();
    browserPage = await ctx.newPage();
    return browserPage;
  };
  const withBrowserPage = async <T>(fn: (page: Page) => Promise<T>) => {
    const ctx = await getBrowserCtx();
    if (fallbackConcurrency === 1) {
      const page = await getBrowserPage();
      return await fn(page);
    }

    const page = await ctx.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close().catch(() => undefined);
    }
  };

  // Normal downloads can be concurrent. Browser fallback defaults to serialized,
  // but can fan out when forcing fallback benchmarks.
  const limit = pLimit(concurrency);
  const browserLimit = pLimit(Math.max(1, fallbackConcurrency));

  const jobs = assets.map((a) =>
    limit(async () => {
      const fileName = `${String(a.index).padStart(2, '0')}.png`;
      const dest = path.join(dir, fileName);
      const assetStart = performance.now();

      try {
        if (forceBrowserFallback) {
          if (!browserFallback) {
            failed += 1;
            throw new Error('forceBrowserFallback=true requires browserFallback=true');
          }
          return await browserLimit(async () => {
            const fallbackStart = performance.now();
            try {
              await withBrowserPage((page) => downloadViaBrowser(page, a, dest));
              browserFallbackSuccess += 1;
              return dest;
            } catch (err) {
              failed += 1;
              throw err;
            } finally {
              browserFallbackMs += performance.now() - fallbackStart;
            }
          });
        }

        directAttempts += 1;
        let directErr: unknown | undefined;
        const directStart = performance.now();
        try {
          await downloadOne(a, dest, opts.cookieHeader, {
            timeoutMs: directTimeoutMs,
            retries: directRetries,
          });
          directSuccess += 1;
          return dest;
        } catch (err) {
          directErr = err;
        } finally {
          directMs += performance.now() - directStart;
        }

        if (!browserFallback) {
          failed += 1;
          throw directErr;
        }

        // Fallback: drive the UI "Download as PNG".
        return await browserLimit(async () => {
          const fallbackStart = performance.now();
          try {
            await withBrowserPage((page) => downloadViaBrowser(page, a, dest));
            browserFallbackSuccess += 1;
            return dest;
          } catch (err) {
            failed += 1;
            throw err;
          } finally {
            browserFallbackMs += performance.now() - fallbackStart;
          }
        });
      } finally {
        assetElapsedMs += performance.now() - assetStart;
      }
    }),
  );

  try {
    const files = await Promise.all(jobs);
    const totalMs = performance.now() - startedAt;
    const stats: DownloadPerfStats = {
      assetCount: assets.length,
      concurrency,
      fallbackConcurrency,
      directTimeoutMs,
      directRetries,
      forceBrowserFallback,
      totalMs,
      directAttempts,
      directSuccess,
      browserFallbackSuccess,
      failed,
      directMs,
      browserFallbackMs,
      avgAssetMs: assets.length ? assetElapsedMs / assets.length : 0,
    };
    return { dir, files, metaPath, stats };
  } finally {
    // TS quirk: in some build setups BrowserContext can be inferred oddly; runtime Playwright context does have .close().
    if (browserCtx) await (browserCtx as any).close().catch(() => undefined);
    if (browser) await (browser as any).close().catch(() => undefined);
  }
}
