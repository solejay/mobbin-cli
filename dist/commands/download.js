import { hasStorageState, storageStatePath } from '../auth/storageState.js';
import { MobbinClient } from '../api/mobbinClient.js';
import { downloadFlow } from '../download/downloader.js';
import { ensureValidCookieHeader } from '../auth/session.js';
function extractScreenIdFromUrl(input) {
    const m = input.match(/\/screens\/([a-f0-9-]{36})(?:[/?#]|$)/i);
    return m?.[1];
}
function looksLikeAppScreensUrl(input) {
    return /\/apps\/.+\/[a-f0-9-]{36}\/screens(?:[/?#]|$)/i.test(input);
}
function looksLikeUuid(input) {
    return /^[a-f0-9-]{36}$/i.test(input.trim());
}
function isLikelyInvalidScreenReferenceError(err) {
    if (!(err instanceof Error))
        return false;
    const msg = err.message.toLowerCase();
    // Common failures when screenId is wrong or not found.
    return (msg.includes('/api/screen/fetch-screen-info') ||
        msg.includes('invalid input: expected object') ||
        msg.includes('zod'));
}
function printInvalidShotsIdHelp(originalInput) {
    const trimmed = originalInput.trim();
    console.error(`Could not resolve a Mobbin screen from: ${trimmed}`);
    console.error('`mobbin shots download` expects either:');
    console.error('  1) a screen URL: https://mobbin.com/screens/<screen-id>');
    console.error('  2) a screen id UUID: <screen-id>');
    if (looksLikeAppScreensUrl(trimmed)) {
        console.error('');
        console.error('That looks like an app screens URL. Use this command instead:');
        console.error('  mobbin app screens download --url <app-screens-url> --out <dir>');
        return;
    }
    if (looksLikeUuid(trimmed)) {
        console.error('');
        console.error('Tip: this UUID may be an app version id (not a screen id).');
        console.error('If so, use:');
        console.error('  mobbin app screens download --url <app-screens-url> --out <dir>');
    }
}
export async function cmdDownload(id, opts) {
    const profileName = opts.authProfile ?? 'default';
    if (!hasStorageState(profileName)) {
        console.error('Not logged in. Run: mobbin auth login');
        process.exitCode = 1;
        return;
    }
    const cookieHeader = await ensureValidCookieHeader({ commandName: 'download', profile: profileName });
    if (!cookieHeader) {
        console.error('Not logged in. Run: mobbin auth login');
        process.exitCode = 1;
        return;
    }
    const client = new MobbinClient({ cookieHeader });
    // Accept either a screen id OR a full Mobbin /screens/<uuid> URL.
    const normalizedInput = String(id).trim();
    // Guardrail for common misuse: users pass app-screens URLs to shots command.
    if (looksLikeAppScreensUrl(normalizedInput)) {
        printInvalidShotsIdHelp(normalizedInput);
        process.exitCode = 1;
        return;
    }
    const inferredId = extractScreenIdFromUrl(normalizedInput) ?? normalizedInput;
    let flow;
    try {
        flow = await client.getFlow(inferredId);
    }
    catch (err) {
        if (isLikelyInvalidScreenReferenceError(err)) {
            printInvalidShotsIdHelp(normalizedInput);
            process.exitCode = 1;
            return;
        }
        throw err;
    }
    const assets = await client.listFlowAssets(flow);
    if (!assets.length) {
        console.error('No assets found (download not implemented yet—needs endpoint discovery).');
        process.exitCode = 1;
        return;
    }
    const res = await downloadFlow(flow, assets, {
        outDir: opts.out,
        concurrency: opts.concurrency,
        cookieHeader,
        profileName,
        storageStatePath: storageStatePath(profileName),
        directTimeoutMs: opts.timeoutMs,
        directRetries: opts.retries,
        browserFallback: opts.browserFallback,
        browserHeadless: opts.headless,
    });
    console.log(`Downloaded to: ${res.dir}`);
    console.log(`Wrote metadata: ${res.metaPath}`);
    if (opts.profile) {
        console.log(`Profile: total=${res.stats.totalMs.toFixed(0)}ms assets=${res.stats.assetCount} ` +
            `direct=${res.stats.directSuccess}/${res.stats.directAttempts} ` +
            `fallback=${res.stats.browserFallbackSuccess} failed=${res.stats.failed} ` +
            `avgAsset=${res.stats.avgAssetMs.toFixed(0)}ms`);
    }
}
//# sourceMappingURL=download.js.map