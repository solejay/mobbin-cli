import path from 'node:path';
import { appConfigDir, ensureDir } from '../utils/paths.js';

export function chromeProfilePath(profile = 'default'): string {
  // Isolate Chrome profiles per mobbin-cli profile name (prevents SingletonLock collisions)
  return path.join(appConfigDir(), 'profiles', profile, 'chrome-profile');
}

export function chromeProfileDir(profile = 'default'): string {
  const dir = chromeProfilePath(profile);
  ensureDir(dir);
  return dir;
}
