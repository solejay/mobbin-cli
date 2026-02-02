import path from 'node:path';
import fs from 'node:fs';
import { appConfigDir, ensureDir } from '../utils/paths.js';
export function storageStatePath() {
    return path.join(appConfigDir(), 'storageState.json');
}
export function hasStorageState() {
    return fs.existsSync(storageStatePath());
}
export function ensureStorageStateDir() {
    ensureDir(appConfigDir());
}
//# sourceMappingURL=storageState.js.map