export type LoginOptions = {
    loginUrl?: string;
    postLoginUrl?: string;
    timeoutMs?: number;
    profile?: string;
};
export declare function loginInteractive(opts?: LoginOptions): Promise<{
    storageState: string;
}>;
//# sourceMappingURL=login.d.ts.map