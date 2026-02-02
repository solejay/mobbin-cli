import { hasStorageState } from '../auth/storageState.js';
import { cookieHeaderFromStorageState } from '../auth/cookies.js';
import { MobbinClient } from '../api/mobbinClient.js';
import { downloadFlow } from '../download/downloader.js';

export async function cmdDownload(id: string, opts: { out: string; concurrency?: number }) {
  if (!hasStorageState()) {
    console.error('Not logged in. Run: mobbin login');
    process.exitCode = 1;
    return;
  }

  const cookieHeader = cookieHeaderFromStorageState();
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
    browserFallback: true,
    browserHeadless: false,
  });

  console.log(`Downloaded to: ${res.dir}`);
  console.log(`Wrote metadata: ${res.metaPath}`);
}
