type BenchmarkDownloadOptions = {
    out: string;
    concurrencyList: number[];
    runs?: number;
    repeat?: number;
    forceFallback?: boolean;
    browserFallback?: boolean;
    headless?: boolean;
    timeoutMs?: number;
    retries?: number;
    json?: boolean;
};
export declare function cmdBenchmarkDownload(id: string, opts: BenchmarkDownloadOptions): Promise<void>;
export {};
//# sourceMappingURL=benchmarkDownload.d.ts.map