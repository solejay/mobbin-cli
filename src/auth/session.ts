import { cookieHeaderFromStorageState } from './cookies.js';
import { loginInteractive } from './login.js';
import { hasStorageState, storageStatePath } from './storageState.js';
import { MobbinClient } from '../api/mobbinClient.js';

type EnsureSessionOptions = {
  commandName?: string;
  profile?: string;
};

/**
 * Returns a valid Cookie header for Mobbin API calls.
 * If a stored session exists but is expired, it automatically runs interactive login once.
 */
export async function ensureValidCookieHeader(
  opts: EnsureSessionOptions = {},
): Promise<string | undefined> {
  const profile = opts.profile ?? 'default';
  if (!hasStorageState(profile)) return undefined;

  let cookieHeader = cookieHeaderFromStorageState(storageStatePath(profile));
  let client = new MobbinClient({ cookieHeader });
  let whoami = await client.whoami();

  if (whoami.ok) return cookieHeader;

  const scope = opts.commandName ? ` for ${opts.commandName}` : '';
  console.error(`Stored Mobbin session appears expired${scope}. Launching mobbin login...`);

  await loginInteractive({ profile });

  cookieHeader = cookieHeaderFromStorageState(storageStatePath(profile));
  client = new MobbinClient({ cookieHeader });
  whoami = await client.whoami();
  if (!whoami.ok) {
    throw new Error(`Re-authentication failed: ${whoami.message ?? 'unknown error'}`);
  }

  console.error('Re-authentication successful. Continuing command...');
  return cookieHeader;
}
