import { hasStorageState } from '../auth/storageState.js';
import { cookieHeaderFromStorageState } from '../auth/cookies.js';
import { MobbinClient } from '../api/mobbinClient.js';

export async function cmdWhoami() {
  if (!hasStorageState()) {
    console.error('Not logged in. Run: mobbin login');
    process.exitCode = 1;
    return;
  }

  const cookieHeader = cookieHeaderFromStorageState();
  const client = new MobbinClient({ cookieHeader });
  const res = await client.whoami();
  console.log(JSON.stringify(res, null, 2));
}
