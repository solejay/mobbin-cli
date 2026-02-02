import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ensureStorageStateDir, storageStatePath } from '../auth/storageState.js';
import { chromeProfileDir } from '../auth/profile.js';
import { appConfigDir, ensureDir } from '../utils/paths.js';

type SniffOptions = {
  out?: string;
  headless?: boolean;
  url?: string;
  timeoutMs?: number;
};

function defaultOutPath() {
  ensureStorageStateDir();
  return path.join(
    appConfigDir(),
    `sniff-${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson`,
  );
}

function isInteresting(url: string) {
  const u = url.toLowerCase();
  // Mobbin appears to be a Next.js app that often fetches data via RSC endpoints
  // (e.g. `*.rsc` or `?_rsc=...`) in addition to conventional /api or graphql.
  return (
    u.includes('mobbin.com') &&
    (u.includes('graphql') ||
      u.includes('/api') ||
      u.includes('search') ||
      u.includes('query') ||
      u.includes('?_rsc=') ||
      u.endsWith('.rsc'))
  );
}

export async function cmdSniff(opts: SniffOptions) {
  const outPath = opts.out ?? defaultOutPath();
  ensureDir(path.dirname(outPath));

  const headless = opts.headless ?? false;
  const url = opts.url ?? 'https://mobbin.com';
  const timeoutMs = opts.timeoutMs ?? 10 * 60_000;

  // Use installed Google Chrome + a persistent profile so it inherits your logged-in state.
  const context = await chromium.launchPersistentContext(chromeProfileDir(), {
    headless,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  // Also keep writing storageState as a backup.
  try {
    const state = await context.storageState();
    fs.writeFileSync(storageStatePath(), JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // ignore
  }

  const page = context.pages()[0] ?? (await context.newPage());

  const stream = fs.createWriteStream(outPath, { flags: 'a' });
  const seen = new Set<string>();

  async function record(kind: string, payload: any) {
    stream.write(`${JSON.stringify({ ts: new Date().toISOString(), kind, ...payload })}\n`);
  }

  page.on('requestfinished', async (req) => {
    try {
      if (req.resourceType() !== 'xhr' && req.resourceType() !== 'fetch') return;
      const rurl = req.url();
      if (!isInteresting(rurl)) return;

      const res = await req.response();
      const status = res?.status();
      const headers = (res?.headers() ?? {}) as Record<string, string>;
      const contentType = headers['content-type'] ?? '';

      // avoid logging duplicates too aggressively
      const key = `${req.method()} ${rurl}`;
      if (seen.has(key) && !rurl.includes('graphql')) return;
      seen.add(key);

      let postData: string | undefined;
      try {
        postData = req.postData() ?? undefined;
      } catch {
        postData = undefined;
      }

      let bodyText: string | undefined;
      // Capture JSON bodies and also Next.js RSC payloads (text/x-component)
      if (
        res &&
        (contentType.includes('application/json') || contentType.includes('text/x-component'))
      )
        try {
          bodyText = await res.text();
          if (bodyText.length > 50_000) bodyText = bodyText.slice(0, 50_000) + '…<truncated>';
        } catch {
          bodyText = undefined;
        }

      await record('http', {
        request: {
          method: req.method(),
          url: rurl,
          headers: req.headers(),
          postData,
        },
        response: {
          status,
          headers,
          contentType,
          body: bodyText,
        },
      });

      // Also print a useful one-liner.
      console.log(`[sniff] ${req.method()} ${status ?? ''} ${rurl}`);
    } catch {
      // ignore
    }
  });

  console.log(`Sniffing network requests. Output: ${outPath}`);
  console.log('Using the persistent Chrome profile under ~/.config/mobbin-cli/chrome-profile');
  console.log('Do your Mobbin search in the opened browser tab. Close the browser when done.');

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Keep browser open until user closes it or timeout.
  await Promise.race([
    page.waitForEvent('close').catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  await record('summary', { message: 'sniff session ended', outPath, seen: Array.from(seen) });

  stream.end();
  await context.close();
  console.log(`Sniff complete. Saved: ${outPath}`);
}
