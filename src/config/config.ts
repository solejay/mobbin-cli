import os from 'node:os';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export type MobbinConfig = {
  version: 1;
  defaultProfile?: string;
  outDir?: string;
};

export function defaultConfigPath(): string {
  return path.join(os.homedir(), '.config', 'mobbin-cli', 'config.json');
}

export function loadConfig(configPath = defaultConfigPath()): MobbinConfig {
  try {
    if (!existsSync(configPath)) {
      return { version: 1 };
    }
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MobbinConfig>;
    return { version: 1, ...parsed };
  } catch {
    return { version: 1 };
  }
}

export function saveConfig(config: MobbinConfig, configPath = defaultConfigPath()): void {
  const dir = path.dirname(configPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function getProfileName(opts: { profile?: string }, config: MobbinConfig): string {
  return opts.profile || process.env.MOBBIN_PROFILE || config.defaultProfile || 'default';
}
