export type OutputMode = 'human' | 'json' | 'plain';

export function resolveOutputMode(opts: { json?: boolean; plain?: boolean }): OutputMode {
  if (opts.json) return 'json';
  if (opts.plain) return 'plain';
  return 'human';
}

export function printJson(value: unknown) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

export function printPlain(lines: string[]) {
  process.stdout.write(lines.join('\n') + (lines.length ? '\n' : ''));
}
