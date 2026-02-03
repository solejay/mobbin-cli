import fs from 'node:fs';
import { storageStatePath } from '../auth/storageState.js';
import { chromeProfilePath } from '../auth/profile.js';

export type LogoutOptions = {
  keepProfile?: boolean;
};

export function cmdLogout(opts: LogoutOptions = {}) {
  const removed: string[] = [];

  const statePath = storageStatePath();
  if (fs.existsSync(statePath)) {
    fs.rmSync(statePath, { force: true });
    removed.push(statePath);
  }

  if (!opts.keepProfile) {
    const profilePath = chromeProfilePath();
    if (fs.existsSync(profilePath)) {
      fs.rmSync(profilePath, { recursive: true, force: true });
      removed.push(profilePath);
    }
  }

  if (!removed.length) {
    console.log('No session data found.');
    return;
  }

  console.log('Removed session data:');
  for (const p of removed) console.log(`- ${p}`);
}
