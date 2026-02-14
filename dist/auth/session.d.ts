type EnsureSessionOptions = {
    commandName?: string;
    profile?: string;
};
/**
 * Returns a valid Cookie header for Mobbin API calls.
 * If a stored session exists but is expired, it automatically runs interactive login once.
 */
export declare function ensureValidCookieHeader(opts?: EnsureSessionOptions): Promise<string | undefined>;
export {};
//# sourceMappingURL=session.d.ts.map