import { chromium, type BrowserContext } from 'playwright';
import fs from 'node:fs';
import { ensureStorageStateDir, storageStatePath } from './storageState.js';
import { chromeProfileDir } from './profile.js';

// NOTE: This is intentionally generic.
// You may need to tweak the "logged-in" detector once we know Mobbin's UI.
const DEFAULT_LOGIN_URL = 'https://mobbin.com/login';
const DEFAULT_POST_LOGIN_URL = 'https://mobbin.com';

export type LoginOptions = {
  loginUrl?: string;
  postLoginUrl?: string;
  timeoutMs?: number;
};

async function waitForLoggedIn(context: BrowserContext, timeoutMs: number) {
  const page = context.pages()[0] ?? (await context.newPage());

  // Prefer a real auth-gated check over URL/cookie heuristics.
  // Discovered via sniff: `/api/recent-searches` returns 200 when authenticated.
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // If they’re still on the login page, give them time.
    const url = page.url();

    try {
      const res = await context.request.get('https://mobbin.com/api/recent-searches');
      if (res.ok()) return;
    } catch {
      // ignore
    }

    if (!url.includes('/login')) {
      // Secondary heuristic: cookies exist and we’re not on /login
      const cookies = await context.cookies();
      if (cookies.length > 3) {
        // still might be unauthenticated, but better than nothing
      }
    }

    await page.waitForTimeout(800);
  }

  throw new Error(
    'Login timeout: still looks like you are not authenticated (expected /api/recent-searches to succeed).',
  );
}

export async function loginInteractive(opts: LoginOptions = {}) {
  const loginUrl = opts.loginUrl ?? DEFAULT_LOGIN_URL;
  const postLoginUrl = opts.postLoginUrl ?? DEFAULT_POST_LOGIN_URL;
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;

  ensureStorageStateDir();

  // Use the installed Google Chrome (less likely to trigger "browser may not be secure" warnings)
  // and a persistent profile to behave more like a normal browser.
  const context = await chromium.launchPersistentContext(chromeProfileDir(), {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

  // User completes login (and 2FA) manually.
  // We help by navigating to a post-login URL after they finish.
  await waitForLoggedIn(context, timeoutMs).catch(async () => {
    // Sometimes the login page won't change URL; try a post-login navigation.
    await page.goto(postLoginUrl, { waitUntil: 'domcontentloaded' });
    await waitForLoggedIn(context, timeoutMs);
  });

  const state = await context.storageState();
  fs.writeFileSync(storageStatePath(), JSON.stringify(state, null, 2), 'utf-8');

  await context.close();

  return { storageState: storageStatePath() };
}
