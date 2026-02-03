import path from 'node:path';
import { appConfigDir, ensureDir } from '../utils/paths.js';

export function chromeProfilePath(): string {
  return path.join(appConfigDir(), 'chrome-profile');
}

export function chromeProfileDir(): string {
  const dir = chromeProfilePath();
  ensureDir(dir);
  return dir;
}
