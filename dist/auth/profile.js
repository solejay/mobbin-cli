import path from 'node:path';
import { appConfigDir, ensureDir } from '../utils/paths.js';
export function chromeProfilePath(profile = 'default') {
    // Isolate Chrome profiles per mobbin-cli profile name (prevents SingletonLock collisions)
    return path.join(appConfigDir(), 'profiles', profile, 'chrome-profile');
}
export function chromeProfileDir(profile = 'default') {
    const dir = chromeProfilePath(profile);
    ensureDir(dir);
    return dir;
}
//# sourceMappingURL=profile.js.map