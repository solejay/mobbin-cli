import { Command } from 'commander';
import { cmdLogin } from '../commands/login.js';
import { cmdLogout } from '../commands/logout.js';
import { cmdWhoami } from '../commands/whoami.js';
import { resolveProfile } from '../utils/profileRuntime.js';

export function registerAuthCommands(parent: Command) {
  const cmd = parent.command('auth').description('Authentication and session management');

  cmd
    .command('login')
    .description('Login to Mobbin using an interactive browser (handles 2FA).')
    .option('--profile <name>', 'Profile name', undefined)
    .action(async (opts) => {
      await cmdLogin({ profile: resolveProfile(opts) });
    });

  cmd
    .command('logout')
    .description('Clear stored session data (cookies, Playwright profile).')
    .option('--profile <name>', 'Profile name', undefined)
    .option('--keep-profile', 'Keep the Playwright Chrome profile (cookies/cache)', false)
    .action(async (opts) => {
      cmdLogout({ ...opts, profile: resolveProfile(opts) });
    });

  cmd
    .command('status')
    .description('Check whether your stored session looks valid.')
    .option('--profile <name>', 'Profile name', undefined)
    .action(async (opts) => {
      await cmdWhoami({ profile: resolveProfile(opts) });
    });
}
