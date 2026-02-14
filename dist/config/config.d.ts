export type MobbinConfig = {
    version: 1;
    defaultProfile?: string;
    outDir?: string;
};
export declare function defaultConfigPath(): string;
export declare function loadConfig(configPath?: string): MobbinConfig;
export declare function saveConfig(config: MobbinConfig, configPath?: string): void;
export declare function getProfileName(opts: {
    profile?: string;
}, config: MobbinConfig): string;
//# sourceMappingURL=config.d.ts.map