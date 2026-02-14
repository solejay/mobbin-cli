export function resolveOutputMode(opts) {
    if (opts.json)
        return 'json';
    if (opts.plain)
        return 'plain';
    return 'human';
}
export function printJson(value) {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}
export function printPlain(lines) {
    process.stdout.write(lines.join('\n') + (lines.length ? '\n' : ''));
}
//# sourceMappingURL=output.js.map