import { hasStorageState, storageStatePath } from '../auth/storageState.js';
import { MobbinClient } from '../api/mobbinClient.js';
import { downloadFlow } from '../download/downloader.js';
import { ensureValidCookieHeader } from '../auth/session.js';

export async function cmdDownload(
  id: string,
  opts: {
    out: string;
    concurrency?: number;
    browserFallback?: boolean;
    headless?: boolean;
    timeoutMs?: number;
    retries?: number;
    profile?: boolean;
  },
) {
  if (!hasStorageState()) {
    console.error('Not logged in. Run: mobbin login');
    process.exitCode = 1;
    return;
  }

  const cookieHeader = await ensureValidCookieHeader({ commandName: 'download' });
  if (!cookieHeader) {
    console.error('Not logged in. Run: mobbin login');
    process.exitCode = 1;
    return;
  }

  const client = new MobbinClient({ cookieHeader });

  const flow = await client.getFlow(id);
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
    storageStatePath: storageStatePath(),
    directTimeoutMs: opts.timeoutMs,
    directRetries: opts.retries,
    browserFallback: opts.browserFallback,
    browserHeadless: opts.headless,
  });

  console.log(`Downloaded to: ${res.dir}`);
  console.log(`Wrote metadata: ${res.metaPath}`);

  if (opts.profile) {
    console.log(
      `Profile: total=${res.stats.totalMs.toFixed(0)}ms assets=${res.stats.assetCount} ` +
        `direct=${res.stats.directSuccess}/${res.stats.directAttempts} ` +
        `fallback=${res.stats.browserFallbackSuccess} failed=${res.stats.failed} ` +
        `avgAsset=${res.stats.avgAssetMs.toFixed(0)}ms`,
    );
  }
}
