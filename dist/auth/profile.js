import path from 'node:path';
import { appConfigDir, ensureDir } from '../utils/paths.js';
export function chromeProfileDir() {
    const dir = path.join(appConfigDir(), 'chrome-profile');
    ensureDir(dir);
    return dir;
}
//# sourceMappingURL=profile.js.map