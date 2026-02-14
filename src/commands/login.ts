import { loginInteractive } from '../auth/login.js';

export async function cmdLogin(opts?: { profile?: string }) {
  const res = await loginInteractive({ profile: opts?.profile ?? 'default' });
  console.log(`Saved session to: ${res.storageState}`);
}
