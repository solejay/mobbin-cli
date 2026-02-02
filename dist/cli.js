#!/usr/bin/env node
import { Command } from 'commander';
import { cmdLogin } from './commands/login.js';
import { cmdWhoami } from './commands/whoami.js';
import { cmdSearch } from './commands/search.js';
import { cmdDownload } from './commands/download.js';
import { cmdSniff } from './commands/sniff.js';
const program = new Command();
program.name('mobbin').description('Mobbin CLI (Playwright-assisted)').version('0.1.0');
program
    .command('login')
    .description('Login to Mobbin using an interactive browser (handles 2FA).')
    .action(async () => {
    await cmdLogin();
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
    .option('--platform <platform>', 'ios|android|web')
    .option('--limit <n>', 'Limit results', (v) => Number(v))
    .option('--json', 'JSON output', false)
    .action(async (query, opts) => {
    await cmdSearch(query, opts);
});
program
    .command('download')
    .description('Download all screens for a flow/result id (by app → by flow).')
    .argument('<id>', 'Result/flow id')
    .requiredOption('--out <dir>', 'Output directory')
    .option('--concurrency <n>', 'Download concurrency', (v) => Number(v))
    .action(async (id, opts) => {
    await cmdDownload(id, opts);
});
program
    .command('sniff')
    .description('Open Mobbin in a browser and log likely-relevant XHR/fetch requests (to help discover search/flow endpoints).')
    .option('--out <file>', 'Write NDJSON to this file (defaults to ~/.config/mobbin-cli/)')
    // NOTE: Commander treats `--flag=false` as an *option value* only if the option accepts an argument.
    // We accept `--headless`, `--headless=false`, and `--headless true/false` for convenience.
    .option('--headless [boolean]', 'Run browser headless (not recommended for login/2FA). Accepts true/false; omit value to mean true.', (v) => {
    if (v === undefined)
        return true;
    const s = String(v).toLowerCase().trim();
    if (['true', '1', 'yes', 'y'].includes(s))
        return true;
    if (['false', '0', 'no', 'n'].includes(s))
        return false;
    throw new Error(`Invalid value for --headless: ${v} (expected true/false)`);
}, false)
    .option('--url <url>', 'Start URL', 'https://mobbin.com')
    .option('--timeout-ms <n>', 'Auto-stop after N ms', (v) => Number(v))
    .action(async (opts) => {
    await cmdSniff(opts);
});
await program.parseAsync(process.argv);
//# sourceMappingURL=cli.js.map