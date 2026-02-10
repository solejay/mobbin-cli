import { hasStorageState } from '../auth/storageState.js';
import { MobbinClient } from '../api/mobbinClient.js';
import { ensureValidCookieHeader } from '../auth/session.js';

export async function cmdWhoami() {
  if (!hasStorageState()) {
    console.error('Not logged in. Run: mobbin login');
    process.exitCode = 1;
    return;
  }

  const cookieHeader = await ensureValidCookieHeader({ commandName: 'whoami' });
  if (!cookieHeader) {
    console.error('Not logged in. Run: mobbin login');
    process.exitCode = 1;
    return;
  }

  const client = new MobbinClient({ cookieHeader });
  const res = await client.whoami();
  console.log(JSON.stringify(res, null, 2));
}
