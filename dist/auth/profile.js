import path from 'node:path';
import { appConfigDir, ensureDir } from '../utils/paths.js';
export function chromeProfilePath() {
    return path.join(appConfigDir(), 'chrome-profile');
}
export function chromeProfileDir() {
    const dir = chromeProfilePath();
    ensureDir(dir);
    return dir;
}
//# sourceMappingURL=profile.js.map