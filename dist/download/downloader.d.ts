import type { Flow, ScreenAsset } from '../types/models.js';
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
export declare function downloadFlow(flow: Flow, assets: ScreenAsset[], opts: DownloadOptions): Promise<DownloadFlowResult>;
//# sourceMappingURL=downloader.d.ts.map