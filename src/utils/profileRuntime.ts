import { loadConfig, getProfileName } from '../config/config.js';

export function resolveProfile(opts?: { profile?: string }): string {
  const cfg = loadConfig();
  return getProfileName({ profile: opts?.profile }, cfg);
}
