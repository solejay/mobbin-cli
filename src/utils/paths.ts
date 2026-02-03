import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export function appConfigDir(): string {
  const home = os.homedir();
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return path.join(xdg, 'mobbin-cli');

  if (process.platform === 'win32') {
    const base = process.env.APPDATA ?? home;
    return path.join(base, 'mobbin-cli');
  }

  // macOS/Linux friendly default
  return path.join(home, '.config', 'mobbin-cli');
}

export function appCacheDir(): string {
  const home = os.homedir();
  const xdg = process.env.XDG_CACHE_HOME;
  if (xdg) return path.join(xdg, 'mobbin-cli');

  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA ?? process.env.APPDATA ?? home;
    return path.join(base, 'mobbin-cli', 'cache');
  }

  return path.join(home, '.cache', 'mobbin-cli');
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}
