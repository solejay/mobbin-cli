import { hasStorageState, storageStatePath } from '../auth/storageState.js';
import { MobbinClient } from '../api/mobbinClient.js';
import { downloadFlow } from '../download/downloader.js';
import { ensureValidCookieHeader } from '../auth/session.js';
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
    // Accept either a screen/flow id OR a full Mobbin URL.
    const normalizedId = String(id).trim();
    const screenMatch = normalizedId.match(/\/screens\/([a-f0-9-]{36})/i);
    const inferredId = screenMatch?.[1] ?? normalizedId;
    const flow = await client.getFlow(inferredId);
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