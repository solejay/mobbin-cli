import path from 'node:path';
import fs from 'node:fs';
import { appConfigDir, ensureDir } from '../utils/paths.js';
export function storageStatePath(profile = 'default') {
    return path.join(appConfigDir(), 'profiles', profile, 'storageState.json');
}
export function hasStorageState(profile = 'default') {
    return fs.existsSync(storageStatePath(profile));
}
export function ensureStorageStateDir(profile = 'default') {
    ensureDir(path.dirname(storageStatePath(profile)));
}
//# sourceMappingURL=storageState.js.map