import os from 'node:os';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config/config.js';

type UpdateState = {
  lastCheckedAt?: string;
  lastKnownRemoteSha?: string;
  lastKnownLocalSha?: string;
  lastUpdateAttemptAt?: string;
  lastUpdateTargetSha?: string;
  lastUpdateStatus?: 'started' | 'failed';
  lastUpdateError?: string;
};

const DEFAULT_CHECK_INTERVAL_HOURS = 20;
const DEFAULT_REPO = 'solejay/mobbin-cli';
const DEFAULT_BRANCH = 'main';

function updateStatePath(): string {
  return path.join(os.homedir(), '.config', 'mobbin-cli', 'update-state.json');
}

function updateLockPath(): string {
  return path.join(os.homedir(), '.config', 'mobbin-cli', 'update-state.lock');
}

function ensureStateDir() {
  mkdirSync(path.dirname(updateStatePath()), { recursive: true });
}

function loadState(): UpdateState {
  try {
    const raw = readFileSync(updateStatePath(), 'utf-8');
    return JSON.parse(raw) as UpdateState;
  } catch {
    return {};
  }
}

function saveState(state: UpdateState) {
  ensureStateDir();
  writeFileSync(updateStatePath(), JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

function shouldSkip(argv: string[]): boolean {
  if (process.env.MOBBIN_NO_AUTO_UPDATE === '1') return true;
  if (argv.includes('--no-update-check')) return true;

  // Keep help/version snappy.
  if (argv.includes('--help') || argv.includes('-h')) return true;
  if (argv.includes('--version') || argv.includes('-V')) return true;

  return false;
}

function parseIntervalHours(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_CHECK_INTERVAL_HOURS;
  return n;
}

function isCheckDue(state: UpdateState, intervalHours: number): boolean {
  if (!state.lastCheckedAt) return true;
  const t = Date.parse(state.lastCheckedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t >= intervalHours * 60 * 60 * 1000;
}

function tryAcquireLock(): boolean {
  ensureStateDir();
  try {
    // Atomic create; fails if already present.
    writeFileSync(updateLockPath(), String(process.pid), { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    unlinkSync(updateLockPath());
  } catch {
    // ignore
  }
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function packageJsonPathFromModule(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '../../package.json');
}

function detectLocalSha(pkgPath: string): string | undefined {
  try {
    const raw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as { gitHead?: string };
    if (pkg.gitHead) return String(pkg.gitHead).trim();
  } catch {
    // ignore
  }

  const root = path.dirname(pkgPath);
  // Best effort for npm link/dev checkouts.
  try {
    if (existsSync(path.join(root, '.git'))) {
      const out = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
      if (out) return out;
    }
  } catch {
    // ignore
  }

  return undefined;
}

async function fetchRemoteSha(repo: string, branch: string, userAgent: string): Promise<string | undefined> {
  const url = `https://api.github.com/repos/${repo}/commits/${branch}`;
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 4500);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': userAgent,
      },
    });

    if (!res.ok) return undefined;
    const json = (await res.json()) as { sha?: string };
    if (!json.sha) return undefined;
    return String(json.sha).trim();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function spawnBackgroundUpdate(repo: string, branch: string) {
  const ref = `${repo}#${branch}`;
  const cmd = `npm install -g github:${ref} > /tmp/mobbin-cli-autoupdate.log 2>&1`;

  const child = spawn('bash', ['-lc', cmd], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

export async function maybeAutoUpdate(argv: string[]): Promise<void> {
  if (shouldSkip(argv)) return;

  const cfg = loadConfig();
  const enabled = cfg.autoUpdate !== false && process.env.MOBBIN_AUTO_UPDATE !== '0';
  if (!enabled) return;

  const intervalHours = parseIntervalHours(
    process.env.MOBBIN_AUTO_UPDATE_CHECK_HOURS ?? cfg.autoUpdateCheckHours,
  );

  const state = loadState();
  if (!isCheckDue(state, intervalHours)) return;

  if (!tryAcquireLock()) return;

  try {
    const pkgPath = packageJsonPathFromModule();
    const localSha = detectLocalSha(pkgPath);

    const rawPkg = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(rawPkg) as { version?: string };
    const version = pkg.version ?? '0.0.0';

    const repo = String(process.env.MOBBIN_AUTO_UPDATE_REPO ?? cfg.autoUpdateRepo ?? DEFAULT_REPO);
    const branch = String(process.env.MOBBIN_AUTO_UPDATE_BRANCH ?? cfg.autoUpdateBranch ?? DEFAULT_BRANCH);

    const remoteSha = await fetchRemoteSha(repo, branch, `mobbin-cli/${version}`);

    const nowIso = new Date().toISOString();
    state.lastCheckedAt = nowIso;
    if (localSha) state.lastKnownLocalSha = localSha;
    if (remoteSha) state.lastKnownRemoteSha = remoteSha;
    saveState(state);

    if (!localSha || !remoteSha) return;
    if (localSha === remoteSha) return;

    const mode = String(process.env.MOBBIN_AUTO_UPDATE_MODE ?? cfg.autoUpdateMode ?? 'apply');

    if (mode !== 'apply') {
      console.error(
        `[mobbin] Update available (${shortSha(localSha)} -> ${shortSha(remoteSha)}). ` +
          `Run: npm install -g github:${repo}#${branch}`,
      );
      return;
    }

    state.lastUpdateAttemptAt = nowIso;
    state.lastUpdateTargetSha = remoteSha;
    state.lastUpdateStatus = 'started';
    state.lastUpdateError = undefined;
    saveState(state);

    spawnBackgroundUpdate(repo, branch);
    console.error(
      `[mobbin] Update available (${shortSha(localSha)} -> ${shortSha(remoteSha)}). ` +
        `Applying in background (next run will use latest).`,
    );
  } catch (err) {
    const state = loadState();
    state.lastUpdateStatus = 'failed';
    state.lastUpdateError = err instanceof Error ? err.message : String(err);
    saveState(state);
  } finally {
    releaseLock();
  }
}
