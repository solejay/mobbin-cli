import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import pLimit from 'p-limit';
import { chromium } from 'playwright';
import { chromeProfileDir } from '../auth/profile.js';
import { sanitizeName, ensureDir } from '../utils/fsSafe.js';
function flowDir(outDir, flow) {
    const app = sanitizeName(flow.appName);
    const flowName = sanitizeName(flow.flowName);
    return path.join(outDir, app, flowName);
}
async function downloadOne(asset, destPath, cookieHeader) {
    const res = await fetch(asset.imageUrl, {
        headers: {
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            accept: 'image/*,*/*;q=0.8',
        },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed ${res.status} downloading ${asset.imageUrl}\n${text.slice(0, 300)}`);
    }
    const ctype = res.headers.get('content-type') ?? '';
    if (!ctype.startsWith('image/')) {
        // Often means we received an HTML login page.
        const text = await res.text().catch(() => '');
        throw new Error(`Expected image/* but got ${ctype} for ${asset.imageUrl}\n${text.slice(0, 300)}`);
    }
    ensureDir(path.dirname(destPath));
    const file = fs.createWriteStream(destPath);
    if (!res.body)
        throw new Error('No response body');
    // Node 18+ can convert WebStreams → Node streams
    const nodeReadable = (await import('node:stream')).Readable.fromWeb(res.body);
    await pipeline(nodeReadable, file);
}
async function dismissOverlays(page) {
    // Mobbin occasionally shows overlays/modals that intercept clicks.
    // Be gentle: try Escape, and try clicking a visible Close button.
    try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
        await page.keyboard.press('Escape');
    }
    catch {
        // ignore
    }
    try {
        const closeBtn = page.getByRole('button', { name: /^close$/i }).first();
        if (await closeBtn.isVisible().catch(() => false))
            await closeBtn.click({ timeout: 1000 });
    }
    catch {
        // ignore
    }
}
async function clickDownloadAsPng(page) {
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
    await page.waitForTimeout(200);
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
async function downloadViaBrowser(ctx, asset, destPath) {
    ensureDir(path.dirname(destPath));
    const page = await ctx.newPage();
    try {
        await page.goto(`https://mobbin.com/screens/${asset.screenId}`, { waitUntil: 'domcontentloaded' });
        // Let the client-rendered UI settle (icons/actions often appear after hydration).
        try {
            await page.waitForLoadState('networkidle', { timeout: 15_000 });
        }
        catch {
            // ignore
        }
        await page.waitForTimeout(1500);
        const download = await clickDownloadAsPng(page);
        // Force filename to our convention.
        await download.saveAs(destPath);
    }
    finally {
        await page.close().catch(() => undefined);
    }
}
export async function downloadFlow(flow, assets, opts) {
    const dir = flowDir(opts.outDir, flow);
    ensureDir(dir);
    const metaPath = path.join(dir, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify({
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
    }, null, 2), 'utf-8');
    const browserFallback = opts.browserFallback ?? true;
    const browserHeadless = opts.browserHeadless ?? true;
    // We'll only spin up Playwright if we actually need it.
    let browserCtx = null;
    const getBrowserCtx = async () => {
        if (browserCtx)
            return browserCtx;
        // Use installed Google Chrome + persistent profile (inherits logged-in state)
        browserCtx = await chromium.launchPersistentContext(chromeProfileDir(), {
            headless: browserHeadless,
            channel: 'chrome',
            args: ['--disable-blink-features=AutomationControlled'],
            acceptDownloads: true,
        });
        return browserCtx;
    };
    // Normal downloads can be concurrent; browser-fallback should be serialized.
    const limit = pLimit(opts.concurrency ?? 4);
    const browserLimit = pLimit(1);
    const jobs = assets.map((a) => limit(async () => {
        const fileName = `${String(a.index).padStart(2, '0')}.png`;
        const dest = path.join(dir, fileName);
        try {
            await downloadOne(a, dest, opts.cookieHeader);
            return dest;
        }
        catch (err) {
            if (!browserFallback)
                throw err;
            // Fallback: drive the UI "Download as PNG".
            return await browserLimit(async () => {
                const ctx = await getBrowserCtx();
                await downloadViaBrowser(ctx, a, dest);
                return dest;
            });
        }
    }));
    try {
        const files = await Promise.all(jobs);
        return { dir, files, metaPath };
    }
    finally {
        // TS quirk: in some build setups BrowserContext can be inferred oddly; runtime Playwright context does have .close().
        if (browserCtx)
            await browserCtx.close().catch(() => undefined);
    }
}
//# sourceMappingURL=downloader.js.map