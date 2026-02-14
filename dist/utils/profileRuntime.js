import { loadConfig, getProfileName } from '../config/config.js';
export function resolveProfile(opts) {
    const cfg = loadConfig();
    return getProfileName({ profile: opts?.profile }, cfg);
}
//# sourceMappingURL=profileRuntime.js.map