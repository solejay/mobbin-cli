#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command, CommanderError } from 'commander';
import { cmdLogin } from './commands/login.js';
import { cmdWhoami } from './commands/whoami.js';
import { cmdSearch } from './commands/search.js';
import { cmdDownload } from './commands/download.js';
import { cmdSniff } from './commands/sniff.js';
import { cmdLogout } from './commands/logout.js';
const program = new Command();
function readPackageVersion() {
    try {
        const pkgUrl = new URL('../package.json', import.meta.url);
        const raw = readFileSync(pkgUrl, 'utf-8');
        const pkg = JSON.parse(raw);
        return pkg.version ?? '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
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
function parsePlatform(value) {
    const v = value.toLowerCase().trim();
    if (v === 'ios' || v === 'android' || v === 'web')
        return v;
    throw new Error(`Invalid platform: ${value} (expected ios|android|web)`);
}
function isDebugEnabled() {
    const env = process.env.MOBBIN_DEBUG?.toLowerCase();
    if (env && ['1', 'true', 'yes', 'y'].includes(env))
        return true;
    return process.argv.includes('--debug');
}
program
    .name('mobbin')
    .description('Mobbin CLI (Playwright-assisted)')
    .version(readPackageVersion())
    .option('--debug', 'Show stack traces for errors', false);
program
    .command('login')
    .description('Login to Mobbin using an interactive browser (handles 2FA).')
    .action(async () => {
    await cmdLogin();
});
program
    .command('logout')
    .description('Clear stored session data (cookies, Playwright profile).')
    .option('--keep-profile', 'Keep the Playwright Chrome profile (cookies/cache)', false)
    .action(async (opts) => {
    cmdLogout(opts);
});
program
    .command('whoami')
    .description('Check whether your stored session looks valid (placeholder until endpoint discovery).')
    .action(async () => {
    await cmdWhoami();
});
program
    .command('search')
    .description('Search Mobbin for a query.')
    .argument('<query>', 'Search query')
    .option('--platform <platform>', 'ios|android|web', parsePlatform)
    .option('--limit <n>', 'Limit results', parsePositiveInt('limit'))
    .option('--json', 'JSON output', false)
    .action(async (query, opts) => {
    await cmdSearch(query, opts);
});
program
    .command('download')
    .description('Download all screens for a flow/result id (by app → by flow).')
    .argument('<id>', 'Result/flow id')
    .requiredOption('--out <dir>', 'Output directory')
    .option('--concurrency <n>', 'Download concurrency', parsePositiveInt('concurrency'))
    .option('--headless [boolean]', 'Run fallback browser headless (true/false; omit value to mean true)', parseBooleanFlag, true)
    .option('--browser-fallback', 'Enable browser fallback when direct download fails', true)
    .action(async (id, opts) => {
    await cmdDownload(id, opts);
});
program
    .command('sniff')
    .description('Open Mobbin in a browser and log likely-relevant XHR/fetch requests (to help discover search/flow endpoints).')
    .option('--out <file>', 'Write NDJSON to this file (defaults to ~/.config/mobbin-cli/)')
    // NOTE: Commander treats `--flag=false` as an *option value* only if the option accepts an argument.
    // We accept `--headless`, `--headless=false`, and `--headless true/false` for convenience.
    .option('--headless [boolean]', 'Run browser headless (not recommended for login/2FA). Accepts true/false; omit value to mean true.', parseBooleanFlag, false)
    .option('--url <url>', 'Start URL', 'https://mobbin.com')
    .option('--timeout-ms <n>', 'Auto-stop after N ms', parsePositiveInt('timeout-ms'))
    .action(async (opts) => {
    await cmdSniff(opts);
});
async function main() {
    program.exitOverride();
    try {
        await program.parseAsync(process.argv);
    }
    catch (err) {
        const debug = isDebugEnabled();
        if (err instanceof CommanderError) {
            if (err.code === 'commander.helpDisplayed')
                return;
            console.error(err.message);
            process.exitCode = err.exitCode ?? 1;
            if (debug && err.stack)
                console.error(err.stack);
            return;
        }
        const message = err instanceof Error ? err.message : String(err);
        console.error(message);
        if (debug && err instanceof Error && err.stack)
            console.error(err.stack);
        process.exitCode = 1;
    }
}
await main();
//# sourceMappingURL=cli.js.map