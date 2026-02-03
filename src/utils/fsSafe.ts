import fs from 'node:fs';
import path from 'node:path';

export function sanitizeName(input: string, fallback = 'untitled'): string {
  const cleaned = input
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120);

  return cleaned || fallback;
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function joinSafe(...parts: string[]): string {
  return path.join(...parts.filter(Boolean));
}
