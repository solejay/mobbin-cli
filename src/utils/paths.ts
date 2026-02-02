import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export function appConfigDir(): string {
  const home = os.homedir();
  // macOS/Linux friendly; Windows can be added later.
  return path.join(home, '.config', 'mobbin-cli');
}

export function appCacheDir(): string {
  const home = os.homedir();
  return path.join(home, '.cache', 'mobbin-cli');
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}
