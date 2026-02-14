import os from 'node:os';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
export function defaultConfigPath() {
    return path.join(os.homedir(), '.config', 'mobbin-cli', 'config.json');
}
export function loadConfig(configPath = defaultConfigPath()) {
    try {
        if (!existsSync(configPath)) {
            return { version: 1 };
        }
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { version: 1, ...parsed };
    }
    catch {
        return { version: 1 };
    }
}
export function saveConfig(config, configPath = defaultConfigPath()) {
    const dir = path.dirname(configPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
export function getProfileName(opts, config) {
    return opts.profile || process.env.MOBBIN_PROFILE || config.defaultProfile || 'default';
}
//# sourceMappingURL=config.js.map