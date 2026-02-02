import type { Flow, ScreenAsset } from '../types/models.js';
export type DownloadOptions = {
    outDir: string;
    concurrency?: number;
    cookieHeader?: string;
    /**
     * If direct image fetching fails (e.g. broken Supabase URLs), fall back to Playwright UI download.
     * Defaults to true.
     */
    browserFallback?: boolean;
    /** Run fallback browser headless. Defaults to true. */
    browserHeadless?: boolean;
};
export declare function downloadFlow(flow: Flow, assets: ScreenAsset[], opts: DownloadOptions): Promise<{
    dir: string;
    files: string[];
    metaPath: string;
}>;
//# sourceMappingURL=downloader.d.ts.map