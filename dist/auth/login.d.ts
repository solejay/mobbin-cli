export type LoginOptions = {
    loginUrl?: string;
    postLoginUrl?: string;
    timeoutMs?: number;
};
export declare function loginInteractive(opts?: LoginOptions): Promise<{
    storageState: string;
}>;
//# sourceMappingURL=login.d.ts.map