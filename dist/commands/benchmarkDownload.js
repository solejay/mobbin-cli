import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { hasStorageState, storageStatePath } from '../auth/storageState.js';
import { MobbinClient } from '../api/mobbinClient.js';
import { downloadFlow } from '../download/downloader.js';
import { ensureValidCookieHeader } from '../auth/session.js';
function buildBenchmarkAssets(assets, targetCount) {
    if (!assets.length)
        return [];
    const count = Math.max(1, targetCount);
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const source = assets[i % assets.length];
        out.push({
            ...source,
            index: i + 1,
            title: source.title ? `${source.title} [bench ${i + 1}]` : `Screen ${i + 1}`,
        });
    }
    return out;
}
function mean(values) {
    if (!values.length)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function median(values) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0)
        return (sorted[middle - 1] + sorted[middle]) / 2;
    return sorted[middle];
}
export async function cmdBenchmarkDownload(id, opts) {
    if (!hasStorageState()) {
        console.error('Not logged in. Run: mobbin login');
        process.exitCode = 1;
        return;
    }
    const runs = opts.runs ?? 1;
    const repeat = opts.repeat ?? 8;
    const cookieHeader = await ensureValidCookieHeader({ commandName: 'benchmark-download' });
    if (!cookieHeader) {
        console.error('Not logged in. Run: mobbin login');
        process.exitCode = 1;
        return;
    }
    const client = new MobbinClient({ cookieHeader });
    const flow = await client.getFlow(id);
    const discoveredAssets = await client.listFlowAssets(flow);
    if (!discoveredAssets.length) {
        console.error('No assets found for benchmark.');
        process.exitCode = 1;
        return;
    }
    const benchAssets = buildBenchmarkAssets(discoveredAssets, repeat);
    const summaries = [];
    for (const concurrency of opts.concurrencyList) {
        const runsOut = [];
        for (let run = 1; run <= runs; run += 1) {
            const runStart = performance.now();
            const runOutDir = path.join(opts.out, `bench-c${concurrency}-run${run}`);
            try {
                const res = await downloadFlow(flow, benchAssets, {
                    outDir: runOutDir,
                    concurrency,
                    cookieHeader,
                    storageStatePath: storageStatePath(),
                    directTimeoutMs: opts.timeoutMs,
                    directRetries: opts.retries,
                    forceBrowserFallback: opts.forceFallback,
                    browserFallback: opts.browserFallback,
                    browserHeadless: opts.headless,
                });
                runsOut.push({
                    run,
                    ok: true,
                    wallMs: performance.now() - runStart,
                    totalMs: res.stats.totalMs,
                    directSuccess: res.stats.directSuccess,
                    directAttempts: res.stats.directAttempts,
                    fallbackSuccess: res.stats.browserFallbackSuccess,
                    failed: res.stats.failed,
                    dir: res.dir,
                });
            }
            catch (err) {
                runsOut.push({
                    run,
                    ok: false,
                    wallMs: performance.now() - runStart,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
        const successful = runsOut.filter((r) => r.ok);
        const wallTimes = successful.map((r) => r.wallMs);
        const downloadTimes = successful
            .map((r) => r.totalMs)
            .filter((value) => typeof value === 'number');
        const directSuccess = successful
            .map((r) => r.directSuccess)
            .filter((value) => typeof value === 'number');
        const fallbackSuccess = successful
            .map((r) => r.fallbackSuccess)
            .filter((value) => typeof value === 'number');
        const failed = successful
            .map((r) => r.failed)
            .filter((value) => typeof value === 'number');
        summaries.push({
            concurrency,
            successRuns: successful.length,
            totalRuns: runs,
            medianMs: median(wallTimes),
            meanMs: mean(wallTimes),
            meanDownloadMs: mean(downloadTimes),
            meanDirectSuccess: mean(directSuccess),
            meanFallbackSuccess: mean(fallbackSuccess),
            meanFailed: mean(failed),
            runs: runsOut,
        });
    }
    const successfulSummaries = summaries.filter((s) => s.successRuns > 0);
    const fastest = [...successfulSummaries].sort((a, b) => a.medianMs - b.medianMs)[0];
    if (opts.json) {
        console.log(JSON.stringify({
            id,
            flow: {
                appName: flow.appName,
                flowName: flow.flowName,
                sourceUrl: flow.sourceUrl,
            },
            benchmark: {
                assetCount: benchAssets.length,
                sourceAssetCount: discoveredAssets.length,
                runs,
                repeat,
                concurrencyList: opts.concurrencyList,
                forceFallback: opts.forceFallback ?? false,
                timeoutMs: opts.timeoutMs ?? null,
                retries: opts.retries ?? null,
            },
            summaries,
            fastest: fastest
                ? { concurrency: fastest.concurrency, medianMs: fastest.medianMs, meanMs: fastest.meanMs }
                : null,
        }, null, 2));
        return;
    }
    console.log(`Benchmark asset count: ${benchAssets.length} (source assets: ${discoveredAssets.length})`);
    console.log(`Runs per concurrency: ${runs}`);
    console.log(`Force fallback: ${opts.forceFallback ? 'yes' : 'no'}`);
    console.log('');
    for (const summary of summaries) {
        console.log(`c=${summary.concurrency} success=${summary.successRuns}/${summary.totalRuns} ` +
            `median=${summary.medianMs.toFixed(0)}ms mean=${summary.meanMs.toFixed(0)}ms ` +
            `downloadMean=${summary.meanDownloadMs.toFixed(0)}ms ` +
            `directMean=${summary.meanDirectSuccess.toFixed(1)} ` +
            `fallbackMean=${summary.meanFallbackSuccess.toFixed(1)} failedMean=${summary.meanFailed.toFixed(1)}`);
        for (const run of summary.runs) {
            if (run.ok) {
                console.log(`  run ${run.run}: ${run.wallMs.toFixed(0)}ms (download=${(run.totalMs ?? 0).toFixed(0)}ms)`);
            }
            else {
                console.log(`  run ${run.run}: failed after ${run.wallMs.toFixed(0)}ms (${run.error ?? ''})`);
            }
        }
    }
    if (fastest) {
        console.log('');
        console.log(`Recommended concurrency: ${fastest.concurrency} (lowest median wall time ${fastest.medianMs.toFixed(0)}ms)`);
    }
    else {
        console.log('');
        console.log('No successful benchmark runs to recommend a concurrency.');
        process.exitCode = 1;
    }
}
//# sourceMappingURL=benchmarkDownload.js.map