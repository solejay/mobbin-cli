import { Command } from 'commander';
import { cmdDownload } from '../commands/download.js';
import { resolveProfile } from '../utils/profileRuntime.js';
function parseBooleanFlag(v) {
    if (v === undefined)
        return true;
    const s = String(v).toLowerCase().trim();
    if (['true', '1', 'yes', 'y'].includes(s))
        return true;
    if (['false', '0', 'no', 'n'].includes(s))
        return false;
    throw new Error(`Invalid boolean value: ${v} (expected true/false)`);
}
function parsePositiveInt(label) {
    return (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
            throw new Error(`Invalid ${label}: ${v} (expected a positive integer)`);
        }
        return n;
    };
}
function parseNonNegativeInt(label) {
    return (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
            throw new Error(`Invalid ${label}: ${v} (expected a non-negative integer)`);
        }
        return n;
    };
}
export function registerShotsCommands(parent) {
    const cmd = parent.command('shots').description('Work with screens/shots');
    cmd
        .command('download')
        .description('Download all screens for a flow/result id (or a Mobbin /screens/<uuid> URL).')
        .argument('<id>', 'Result/flow id or Mobbin screen URL')
        .requiredOption('--out <dir>', 'Output directory')
        .option('--profile <name>', 'Profile name (defaults to config/env/default)', undefined)
        .option('--concurrency <n>', 'Download concurrency', parsePositiveInt('concurrency'))
        .option('--timeout-ms <n>', 'Direct image-request timeout in ms before fallback', parsePositiveInt('timeout-ms'))
        .option('--retries <n>', 'Direct image-request retries', parseNonNegativeInt('retries'))
        .option('--headless [boolean]', 'Run fallback browser headless (true/false; omit value to mean true)', parseBooleanFlag, true)
        .option('--no-browser-fallback', 'Disable browser fallback when direct download fails')
        .option('--timing', 'Print download timing summary', false)
        .action(async (id, opts) => {
        await cmdDownload(id, {
            out: opts.out,
            concurrency: opts.concurrency,
            timeoutMs: opts.timeoutMs,
            retries: opts.retries,
            headless: opts.headless,
            browserFallback: opts.browserFallback,
            // new: which saved auth profile to use
            authProfile: resolveProfile(opts),
            // keep legacy key for cmdDownload to print timing stats
            profile: opts.timing,
        });
    });
}
//# sourceMappingURL=shots.js.map