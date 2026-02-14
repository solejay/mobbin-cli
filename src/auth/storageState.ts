import path from 'node:path';
import fs from 'node:fs';
import { appConfigDir, ensureDir } from '../utils/paths.js';

export function storageStatePath(profile = 'default'): string {
  return path.join(appConfigDir(), 'profiles', profile, 'storageState.json');
}

export function hasStorageState(profile = 'default'): boolean {
  return fs.existsSync(storageStatePath(profile));
}

export function ensureStorageStateDir(profile = 'default'): void {
  ensureDir(path.dirname(storageStatePath(profile)));
}
