export type OutputMode = 'human' | 'json' | 'plain';
export declare function resolveOutputMode(opts: {
    json?: boolean;
    plain?: boolean;
}): OutputMode;
export declare function printJson(value: unknown): void;
export declare function printPlain(lines: string[]): void;
//# sourceMappingURL=output.d.ts.map