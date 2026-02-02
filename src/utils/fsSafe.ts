import fs from 'node:fs';
import path from 'node:path';

export function sanitizeName(input: string): string {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function joinSafe(...parts: string[]): string {
  return path.join(...parts.filter(Boolean));
}
