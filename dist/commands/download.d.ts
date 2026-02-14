export declare function cmdDownload(id: string, opts: {
    out: string;
    concurrency?: number;
    browserFallback?: boolean;
    headless?: boolean;
    timeoutMs?: number;
    retries?: number;
    /**
     * Legacy flag (hidden command): `--profile` printed timing stats.
     * In new grouped commands we use `--timing` but pass it through here.
     */
    profile?: boolean;
    /** Select which mobbin-cli auth profile to use (storageState + chrome profile). */
    authProfile?: string;
}): Promise<void>;
//# sourceMappingURL=download.d.ts.map