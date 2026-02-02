import path from 'node:path';
import fs from 'node:fs';
import { appConfigDir, ensureDir } from '../utils/paths.js';

export function storageStatePath(): string {
  return path.join(appConfigDir(), 'storageState.json');
}

export function hasStorageState(): boolean {
  return fs.existsSync(storageStatePath());
}

export function ensureStorageStateDir(): void {
  ensureDir(appConfigDir());
}
