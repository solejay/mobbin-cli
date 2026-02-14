import { Command } from 'commander';
import pLimit from 'p-limit';
import { chromium } from 'playwright';
import { ensureValidCookieHeader } from '../auth/session.js';
import { hasStorageState, storageStatePath } from '../auth/storageState.js';
import { MobbinClient } from '../api/mobbinClient.js';
import { downloadFlow } from '../download/downloader.js';
import { resolveProfile } from '../utils/profileRuntime.js';
import type { Flow, Platform, ScreenAsset } from '../types/models.js';

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function parseBooleanFlag(v?: string): boolean {
  if (v === undefined) return true;
  const s = String(v).toLowerCase().trim();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  throw new Error(`Invalid boolean value: ${v} (expected true/false)`);
}

function parsePositiveInt(label: string) {
  return (v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      throw new Error(`Invalid ${label}: ${v} (expected a positive integer)`);
    }
    return n;
  };
}

function parseNonNegativeInt(label: string) {
  return (v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error(`Invalid ${label}: ${v} (expected a non-negative integer)`);
    }
    return n;
  };
}

function normalizePlatform(p?: string | null): Platform {
  const v = (p ?? '').toLowerCase();
  if (v === 'ios') return 'ios';
  if (v === 'android') return 'android';
  if (v === 'web') return 'web';
  return 'unknown';
}

async function dismissOverlays(page: any) {
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
  } catch {
    // ignore
  }
}

function extractScreenIdsFromHrefs(hrefs: Array<string | null | undefined>): string[] {
  const ids: string[] = [];
  for (const href of hrefs) {
    const m = String(href || '').match(/\/screens\/([a-f0-9-]{36})/i);
    if (m?.[1]) ids.push(m[1]);
  }
  return uniq(ids);
}

async function scrapeScreenIdsViaPlaywright(
  appScreensUrl: string,
  opts: { profile: string; headless: boolean },
): Promise<string[]> {
  const { profile, headless } = opts;
  const statePath = storageStatePath(profile);

  const browser = await chromium.launch({
    headless,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();

  await page.goto(appScreensUrl, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);

  let stableRounds = 0;
  let lastCount = 0;
  for (let i = 0; i < 60; i++) {
    const hrefs: string[] = await page
      .locator('a[href^="/screens/"]')
      .evaluateAll((els: any[]) => els.map((e) => e.getAttribute('href')));

    const ids = extractScreenIdsFromHrefs(hrefs);

    const count = ids.length;
    if (count === lastCount) stableRounds += 1;
    else stableRounds = 0;
    lastCount = count;

    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(900);

    if (stableRounds >= 3 && count > 0) {
      await context.close();
      await browser.close();
      return ids;
    }
  }

  const hrefs: string[] = await page
    .locator('a[href^="/screens/"]')
    .evaluateAll((els: any[]) => els.map((e) => e.getAttribute('href')));

  const ids = extractScreenIdsFromHrefs(hrefs);

  await context.close();
  await browser.close();
  return ids;
}

export function registerAppScreensCommands(parent: Command) {
  const app = parent.command('app').description('App-level helpers');
  const screens = app.command('screens').description('Work with app screens');

  screens
    .command('download')
    .description(
      'Download ALL screens from an app screens page URL (scrapes /screens/<uuid> via Playwright scroll).',
    )
    .requiredOption('--url <appScreensUrl>', 'e.g. https://mobbin.com/apps/<slug>/<versionId>/screens')
    .requiredOption('--out <dir>', 'Output directory')
    .option('--profile <name>', 'Profile name (defaults to config/env/default)', undefined)
    .option('--concurrency <n>', 'Download concurrency', parsePositiveInt('concurrency'))
    .option(
      '--timeout-ms <n>',
      'Direct image-request timeout in ms before fallback',
      parsePositiveInt('timeout-ms'),
    )
    .option('--retries <n>', 'Direct image-request retries', parseNonNegativeInt('retries'))
    .option(
      '--headless [boolean]',
      'Run browser headless (true/false; omit value to mean true)',
      parseBooleanFlag,
      true,
    )
    .option('--no-browser-fallback', 'Disable browser fallback when direct download fails')
    .option('--timing', 'Print download timing summary', false)
    .action(async (opts) => {
      const appScreensUrl: string = opts.url;
      const profile = resolveProfile(opts);

      if (!hasStorageState(profile)) {
        console.error('Not logged in. Run: mobbin auth login');
        process.exitCode = 1;
        return;
      }

      const cookieHeader = await ensureValidCookieHeader({
        commandName: 'app screens download',
        profile,
      });

      if (!cookieHeader) {
        console.error('Not logged in. Run: mobbin auth login');
        process.exitCode = 1;
        return;
      }

      const screenIds = await scrapeScreenIdsViaPlaywright(appScreensUrl, {
        profile,
        headless: opts.headless,
      });

      if (!screenIds.length) {
        console.error(
          'No screen URLs found on page. This can happen if Mobbin blocks scrolling or the session is invalid.\n' +
            'Try: mobbin auth status (or re-login), then rerun with --headless=false to observe the page.',
        );
        process.exitCode = 1;
        return;
      }

      console.log(`Found ${screenIds.length} screens. Resolving best image URLs...`);

      const client = new MobbinClient({ cookieHeader });
      const metaConcurrency = Math.min(8, opts.concurrency ?? 8);
      const metaLimit = pLimit(metaConcurrency);

      const resolved = await Promise.all(
        screenIds.map((screenId, idx) =>
          metaLimit(async () => {
            const flow = await client.getFlow(screenId);
            const assets = await client.listFlowAssets(flow);
            const asset = assets[0];
            if (!asset) return undefined;
            const title = flow.flowName;
            const imageUrl = asset.imageUrl;
            const index = idx + 1;

            const resolvedAsset: ScreenAsset = { screenId, index, title, imageUrl };

            return {
              flow,
              asset: resolvedAsset,
            };
          }),
        ),
      );

      const first = resolved.find((r) => r)?.flow;
      const appName = first?.appName ?? 'Unknown App';
      const platform = normalizePlatform((first as any)?.platform);

      const assets: ScreenAsset[] = resolved
        .map((r) => r?.asset)
        .filter((a): a is ScreenAsset => Boolean(a));

      if (!assets.length) {
        console.error('Failed to resolve any downloadable screen assets.');
        process.exitCode = 1;
        return;
      }

      const flow: Flow = {
        id: `app-screens:${appScreensUrl}`,
        appName,
        flowName: 'Screens',
        platform,
        sourceUrl: appScreensUrl,
        screens: assets.map((a) => ({ id: a.screenId, index: a.index, title: a.title })),
      };

      console.log(
        `Downloading ${assets.length} screens → ${opts.out}/${appName}/Screens (browserFallback=${opts.browserFallback ? 'on' : 'off'})...`,
      );

      const res = await downloadFlow(flow, assets, {
        outDir: opts.out,
        concurrency: opts.concurrency,
        cookieHeader,
        profileName: profile,
        storageStatePath: storageStatePath(profile),
        directTimeoutMs: opts.timeoutMs,
        directRetries: opts.retries,
        browserFallback: opts.browserFallback,
        browserHeadless: opts.headless,
      });

      console.log(`Downloaded to: ${res.dir}`);
      console.log(`Wrote metadata: ${res.metaPath}`);

      if (opts.timing) {
        console.log(
          `Timing: total=${res.stats.totalMs.toFixed(0)}ms assets=${res.stats.assetCount} ` +
            `direct=${res.stats.directSuccess}/${res.stats.directAttempts} ` +
            `fallback=${res.stats.browserFallbackSuccess} failed=${res.stats.failed} ` +
            `avgAsset=${res.stats.avgAssetMs.toFixed(0)}ms`,
        );
      }

      console.log(`Storage state: ${storageStatePath(profile)}`);
    });
}
