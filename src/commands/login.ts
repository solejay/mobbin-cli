import { loginInteractive } from '../auth/login.js';

export async function cmdLogin() {
  const res = await loginInteractive();
  console.log(`Saved session to: ${res.storageState}`);
}
