import fs from 'node:fs';
import { storageStatePath } from './storageState.js';
/**
 * Convert Playwright storageState cookies to a single Cookie header.
 */
export function cookieHeaderFromStorageState(filePath = storageStatePath()) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const state = JSON.parse(raw);
    const cookies = state.cookies ?? [];
    // cookie header format: "a=b; c=d"
    return cookies
        .filter((c) => c.name && typeof c.value === 'string')
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
}
//# sourceMappingURL=cookies.js.map