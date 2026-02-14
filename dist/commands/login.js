import { loginInteractive } from '../auth/login.js';
export async function cmdLogin(opts) {
    const res = await loginInteractive({ profile: opts?.profile ?? 'default' });
    console.log(`Saved session to: ${res.storageState}`);
}
//# sourceMappingURL=login.js.map