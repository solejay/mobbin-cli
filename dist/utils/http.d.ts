export type FetchRetryOptions = {
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
    maxRetryDelayMs?: number;
    retryStatus?: number[];
};
export declare function fetchWithRetry(url: string, init?: RequestInit, opts?: FetchRetryOptions): Promise<Response>;
//# sourceMappingURL=http.d.ts.map