import type { Flow, Platform, ScreenAsset, SearchResult } from '../types/models.js';
export type MobbinClientOptions = {
    baseUrl?: string;
    cookieHeader?: string;
    userAgent?: string;
};
export declare class MobbinClient {
    private baseUrl;
    private cookieHeader?;
    private userAgent;
    constructor(opts?: MobbinClientOptions);
    private apiUrl;
    private httpJson;
    whoami(): Promise<{
        ok: boolean;
        message?: string;
    }>;
    search(query: string, opts?: {
        platform?: Platform;
        limit?: number;
    }): Promise<SearchResult[]>;
    getFlow(id: string): Promise<Flow>;
    listFlowAssets(flow: Flow): Promise<ScreenAsset[]>;
}
//# sourceMappingURL=mobbinClient.d.ts.map