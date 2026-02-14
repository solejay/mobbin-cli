#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command, CommanderError } from 'commander';
import { cmdSearch } from './commands/search.js';
import { cmdBenchmarkDownload } from './commands/benchmarkDownload.js';
import { cmdSniff } from './commands/sniff.js';
import type { Platform } from './types/models.js';

import { registerAuthCommands } from './commands_new/auth.js';
import { registerShotsCommands } from './commands_new/shots.js';
import { registerConfigCommands } from './commands_new/config.js';
import { registerAppScreensCommands } from './commands_new/appScreens.js';

const program = new Command();

function readPackageVersion(): string {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url);
    const raw = readFileSync(pkgUrl, 'utf-8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function parseBooleanFlag(v?: string): boolean {
  if (v === undefined) return true;
  const s = String(v).toLowerCase().trim();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  throw new Error(`Invalid boolean value: ${v} (expected true/false)`);
}

function parsePositiveInt(label: string) {
  return (v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      throw new Error(`Invalid ${label}: ${v} (expected a positive integer)`);
    }
    return n;
  };
}

function parseNonNegativeInt(label: string) {
  return (v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error(`Invalid ${label}: ${v} (expected a non-negative integer)`);
    }
    return n;
  };
}

function parsePositiveIntList(label: string) {
  return (v: string) => {
    const values = v
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const n = Number(item);
        if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
          throw new Error(`Invalid ${label}: ${v} (expected comma-separated positive integers)`);
        }
        return n;
      });

    if (!values.length) {
      throw new Error(`Invalid ${label}: ${v} (expected comma-separated positive integers)`);
    }

    return [...new Set(values)];
  };
}

function parsePlatform(value: string): Platform {
  const v = value.toLowerCase().trim();
  if (v === 'ios' || v === 'android' || v === 'web') return v;
  throw new Error(`Invalid platform: ${value} (expected ios|android|web)`);
}

function isDebugEnabled(): boolean {
  const env = process.env.MOBBIN_DEBUG?.toLowerCase();
  if (env && ['1', 'true', 'yes', 'y'].includes(env)) return true;
  return process.argv.includes('--debug');
}

program
  .name('mobbin')
  .description('Mobbin CLI (Playwright-assisted)')
  .version(readPackageVersion())
  .option('--debug', 'Show stack traces for errors', false);

// New grouped command UX (gogcli-inspired)
registerAuthCommands(program);
registerShotsCommands(program);
registerConfigCommands(program);
registerAppScreensCommands(program);

// Legacy flat commands (kept as hidden aliases)
program
  .command('login', { hidden: true })
  .description('Login to Mobbin (alias of `mobbin auth login`).')
  .action(async () => {
    // lazy import to avoid unused imports
    const { cmdLogin } = await import('./commands/login.js');
    await cmdLogin();
  });

program
  .command('logout', { hidden: true })
  .description('Logout (alias of `mobbin auth logout`).')
  .option('--keep-profile', 'Keep the Playwright Chrome profile (cookies/cache)', false)
  .action(async (opts) => {
    const { cmdLogout } = await import('./commands/logout.js');
    cmdLogout(opts);
  });

program
  .command('whoami', { hidden: true })
  .description('Session status (alias of `mobbin auth status`).')
  .action(async () => {
    const { cmdWhoami } = await import('./commands/whoami.js');
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
  .command('download', { hidden: true })
  .description('Download (alias of `mobbin shots download`).')
  .argument('<id>', 'Result/flow id')
  .requiredOption('--out <dir>', 'Output directory')
  .option('--concurrency <n>', 'Download concurrency', parsePositiveInt('concurrency'))
  .option(
    '--timeout-ms <n>',
    'Direct image-request timeout in ms before fallback',
    parsePositiveInt('timeout-ms'),
  )
  .option('--retries <n>', 'Direct image-request retries', parseNonNegativeInt('retries'))
  .option(
    '--headless [boolean]',
    'Run fallback browser headless (true/false; omit value to mean true)',
    parseBooleanFlag,
    true,
  )
  .option('--browser-fallback', 'Enable browser fallback when direct download fails', true)
  .option('--profile', 'Print download timing summary', false)
  .action(async (id, opts) => {
    const { cmdDownload } = await import('./commands/download.js');
    await cmdDownload(id, opts);
  });

program
  .command('benchmark-download')
  .description('Benchmark download performance across different concurrency values.')
  .argument('<id>', 'Result/flow id')
  .requiredOption('--out <dir>', 'Output directory for benchmark runs')
  .option(
    '--concurrency-list <list>',
    'Comma-separated concurrency values (e.g. 2,4,6,8)',
    parsePositiveIntList('concurrency-list'),
    [2, 4, 6, 8],
  )
  .option('--runs <n>', 'Runs per concurrency value', parsePositiveInt('runs'), 1)
  .option(
    '--repeat <n>',
    'Benchmark asset count (duplicates assets if needed; useful while flow support is single-screen)',
    parsePositiveInt('repeat'),
    8,
  )
  .option(
    '--timeout-ms <n>',
    'Direct image-request timeout in ms before fallback',
    parsePositiveInt('timeout-ms'),
  )
  .option('--retries <n>', 'Direct image-request retries', parseNonNegativeInt('retries'))
  .option(
    '--force-fallback',
    'Skip direct image requests and benchmark browser fallback path only',
  )
  .option(
    '--headless [boolean]',
    'Run fallback browser headless (true/false; omit value to mean true)',
    parseBooleanFlag,
    true,
  )
  .option('--browser-fallback', 'Enable browser fallback when direct download fails', true)
  .option('--json', 'Print benchmark results as JSON', false)
  .action(async (id, opts) => {
    await cmdBenchmarkDownload(id, opts);
  });

program
  .command('sniff')
  .description(
    'Open Mobbin in a browser and log likely-relevant XHR/fetch requests (to help discover search/flow endpoints).',
  )
  .option('--out <file>', 'Write NDJSON to this file (defaults to ~/.config/mobbin-cli/)')
  // NOTE: Commander treats `--flag=false` as an *option value* only if the option accepts an argument.
  // We accept `--headless`, `--headless=false`, and `--headless true/false` for convenience.
  .option(
    '--headless [boolean]',
    'Run browser headless (not recommended for login/2FA). Accepts true/false; omit value to mean true.',
    parseBooleanFlag,
    false,
  )
  .option('--url <url>', 'Start URL', 'https://mobbin.com')
  .option('--timeout-ms <n>', 'Auto-stop after N ms', parsePositiveInt('timeout-ms'))
  .action(async (opts) => {
    await cmdSniff(opts);
  });

async function main() {
  program.exitOverride();

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    const debug = isDebugEnabled();

    if (err instanceof CommanderError) {
      if (err.code === 'commander.helpDisplayed') return;
      console.error(err.message);
      process.exitCode = err.exitCode ?? 1;
      if (debug && err.stack) console.error(err.stack);
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    if (debug && err instanceof Error && err.stack) console.error(err.stack);
    process.exitCode = 1;
  }
}

await main();
