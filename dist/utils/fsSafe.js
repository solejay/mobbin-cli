import fs from 'node:fs';
import path from 'node:path';
export function sanitizeName(input, fallback = 'untitled') {
    const cleaned = input
        .trim()
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .slice(0, 120);
    return cleaned || fallback;
}
export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}
export function joinSafe(...parts) {
    return path.join(...parts.filter(Boolean));
}
//# sourceMappingURL=fsSafe.js.map