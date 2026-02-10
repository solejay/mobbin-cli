#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const out = {
    query: null,
    platform: 'ios',
    limit: 15,
    outDir: null,
    resume: true,
    downloadConcurrency: 8,
    downloadTimeoutMs: 15000,
    downloadRetries: 1,
    downloadProfile: true,
    creative: false,
    creativePerQueryLimit: 10,
    creativeMaxPerApp: 2,
    creativeQueryPack: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--query' && next) (out.query = next), i++;
    else if (a === '--platform' && next) (out.platform = next), i++;
    else if (a === '--limit' && next) (out.limit = Number(next)), i++;
    else if (a === '--out' && next) (out.outDir = next), i++;
    else if (a === '--download-concurrency' && next) (out.downloadConcurrency = Number(next)), i++;
    else if (a === '--download-timeout-ms' && next) (out.downloadTimeoutMs = Number(next)), i++;
    else if (a === '--download-retries' && next) (out.downloadRetries = Number(next)), i++;
    else if (a === '--no-download-profile') out.downloadProfile = false;
    else if (a === '--creative') out.creative = true;
    else if (a === '--creative-per-query-limit' && next) (out.creativePerQueryLimit = Number(next)), i++;
    else if (a === '--creative-max-per-app' && next) (out.creativeMaxPerApp = Number(next)), i++;
    else if (a === '--creative-query-pack' && next) (out.creativeQueryPack = next), i++;
    else if (a === '--no-resume') out.resume = false;
    else if (a === '--help') {
      console.log(`Usage:
  gather-inspiration.mjs --query "<screenType>" --platform ios --limit 15 --out ./inspiration/mobbin/<screenType> [--no-resume]
    [--download-concurrency 8] [--download-timeout-ms 15000] [--download-retries 1] [--no-download-profile]
    [--creative] [--creative-per-query-limit 10] [--creative-max-per-app 2]
    [--creative-query-pack "Onboarding,Welcome,Product Tour"]

Examples:
  gather-inspiration.mjs --query "Login" --platform ios --limit 15 --out ./inspiration/mobbin/login
  gather-inspiration.mjs --query "Onboarding" --platform ios --limit 20 --out ./inspiration/mobbin/onboarding
  gather-inspiration.mjs --query "Settings" --platform android --limit 10 --out ./inspiration/mobbin/settings
  gather-inspiration.mjs --query "Empty State" --platform ios --limit 15 --out ./inspiration/mobbin/empty-state
  gather-inspiration.mjs --query "Onboarding for logging" --platform web --limit 20 --out ./inspiration/mobbin/onboarding-logging --creative

Common screen types:
  - Authentication: Login, Sign Up, Forgot Password, OTP, SSO
  - Onboarding: Welcome, Feature Tour, Permissions, Personalization
  - Navigation: Homepage, Dashboard, Tab Bar, Sidebar
  - User: Profile, Settings, Account, Preferences
  - Commerce: Checkout, Cart, Payment, Product Detail
  - Content: Feed, Search, Filters, Detail View
  - Communication: Notifications, Messages, Chat, Inbox
  - States: Empty State, Error, Loading, Success, Offline
`);
      process.exit(0);
    }
  }

  // Validate required args
  if (!out.query) {
    console.error('Error: --query is required. Use --help for usage.');
    process.exit(1);
  }

  // Default outDir based on query if not provided
  if (!out.outDir) {
    const slug = out.query.toLowerCase().replace(/\s+/g, '-');
    out.outDir = `./inspiration/mobbin/${slug}`;
  }

  if (!Number.isInteger(out.downloadConcurrency) || out.downloadConcurrency <= 0) {
    console.error('Error: --download-concurrency must be a positive integer.');
    process.exit(1);
  }
  if (!Number.isInteger(out.downloadTimeoutMs) || out.downloadTimeoutMs <= 0) {
    console.error('Error: --download-timeout-ms must be a positive integer.');
    process.exit(1);
  }
  if (!Number.isInteger(out.downloadRetries) || out.downloadRetries < 0) {
    console.error('Error: --download-retries must be a non-negative integer.');
    process.exit(1);
  }
  if (!Number.isInteger(out.creativePerQueryLimit) || out.creativePerQueryLimit <= 0) {
    console.error('Error: --creative-per-query-limit must be a positive integer.');
    process.exit(1);
  }
  if (!Number.isInteger(out.creativeMaxPerApp) || out.creativeMaxPerApp <= 0) {
    console.error('Error: --creative-max-per-app must be a positive integer.');
    process.exit(1);
  }

  return out;
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function statePath(outDir) {
  return path.join(outDir, '.mobbin-state.json');
}

function loadState(outDir) {
  try {
    const raw = fs.readFileSync(statePath(outDir), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      downloaded: new Set(parsed.downloaded ?? []),
      rows: parsed.rows ?? [],
      failures: parsed.failures ?? [],
    };
  } catch {
    return { downloaded: new Set(), rows: [], failures: [] };
  }
}

function saveState(outDir, state) {
  const payload = {
    downloaded: Array.from(state.downloaded),
    rows: state.rows,
    failures: state.failures,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(statePath(outDir), JSON.stringify(payload, null, 2), 'utf8');
}

function writeIndex(outDir, screenType, rows, failures) {
  const title = toTitleCase(screenType);
  const lines = [];
  lines.push(`# ${title} UI Inspiration`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Screen Type: ${screenType}`);
  lines.push('');
  lines.push('## Downloads');
  lines.push('');
  lines.push('| App | Screen | Local PNG | Notes |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    const notes = (r.notes?.length ? r.notes.join('<br>') : '').replaceAll('|', '\\|');
    lines.push(`| ${r.app.replaceAll('|', '\\|')} | [${r.id}](${r.url}) | ${r.pngPath} | ${notes} |`);
  }

  if (failures.length) {
    lines.push('');
    lines.push('## Failed');
    lines.push('');
    for (const f of failures) {
      lines.push(`- ${f.app} (${f.id}) — ${f.error}`);
    }
  }

  fs.writeFileSync(path.join(outDir, 'INDEX.md'), lines.join('\n') + '\n', 'utf8');
}

function buildDownloadArgs(id, args) {
  return [
    'download',
    id,
    '--out',
    args.outDir,
    '--concurrency',
    String(args.downloadConcurrency),
    '--timeout-ms',
    String(args.downloadTimeoutMs),
    '--retries',
    String(args.downloadRetries),
    ...(args.downloadProfile ? ['--profile'] : []),
  ];
}

function dedupeTerms(terms) {
  const out = [];
  const seen = new Set();
  for (const t of terms) {
    if (!t) continue;
    const key = String(t).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(String(t).trim());
  }
  return out;
}

function inferCreativePack(query) {
  const q = String(query || '').toLowerCase();
  const logging = ['logging', 'log', 'journal', 'history', 'tracking', 'timeline', 'activity'];
  const auth = ['login', 'log in', 'sign in', 'signin', 'sign up', 'signup', 'auth', 'authentication', 'otp', 'sso'];

  let pack;
  if (logging.some(k => q.includes(k))) {
    pack = ['Onboarding', 'Getting Started', 'Welcome', 'First Run', 'Activity Log', 'Journal', 'History', 'Timeline', 'Tracking', 'Progress'];
  } else if (auth.some(k => q.includes(k))) {
    pack = ['Onboarding', 'Welcome', 'First Run', 'Product Tour', 'Permissions', 'Sign Up', 'Login', 'Authentication', 'OTP', 'SSO'];
  } else {
    pack = ['Onboarding', 'Welcome', 'First Run', 'Product Tour', 'Getting Started', 'Permissions', 'Sign Up', 'Login'];
  }

  return dedupeTerms([query, ...pack]);
}

function searchScreens(query, args, limit) {
  const json = sh('mobbin', [
    'search',
    query,
    '--platform',
    args.platform,
    '--limit',
    String(limit),
    '--json',
  ]);
  return JSON.parse(json);
}

function buildCreativeCandidates(args) {
  const queries = args.creativeQueryPack
    ? dedupeTerms(String(args.creativeQueryPack).split(','))
    : inferCreativePack(args.query);
  const byId = new Map();
  const perQuery = [];

  for (const query of queries) {
    try {
      const found = searchScreens(query, args, args.creativePerQueryLimit);
      perQuery.push({ query, count: found.length, ok: true });
      for (const r of found) {
        const existing = byId.get(r.id);
        if (existing) {
          existing.matchedQueries = dedupeTerms([...(existing.matchedQueries ?? []), query]);
        } else {
          byId.set(r.id, { ...r, matchedQueries: [query] });
        }
      }
    } catch (e) {
      perQuery.push({ query, count: 0, ok: false, error: e?.message ?? String(e) });
    }
  }

  return { queries, perQuery, candidates: Array.from(byId.values()) };
}

function pickCreativeResults(candidates, limit, maxPerApp) {
  const pool = candidates.map(c => ({ ...c }));
  const selected = [];
  const appCounts = new Map();
  const seenTags = new Set();
  const pickedIds = new Set();

  while (selected.length < limit) {
    let best = null;
    let bestScore = -Infinity;

    for (const c of pool) {
      if (pickedIds.has(c.id)) continue;
      const app = c.appName ?? 'Unknown App';
      const appCount = appCounts.get(app) ?? 0;
      if (appCount >= maxPerApp) continue;

      const tags = (c.tags ?? []).map(t => String(t));
      const novelTags = tags.filter(t => !seenTags.has(t.toLowerCase())).length;
      const queryBonus = (c.matchedQueries?.length ?? 1) * 2;
      const appBonus = appCount === 0 ? 2 : 0;
      const score = novelTags * 3 + queryBonus + appBonus;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }

    if (!best) {
      // Relax app cap to avoid getting stuck if not enough apps are present.
      const fallback = pool.find(c => !pickedIds.has(c.id));
      if (!fallback) break;
      best = fallback;
      bestScore = (best.matchedQueries?.length ?? 1) * 2;
    }

    best.creativityScore = bestScore;
    selected.push(best);
    pickedIds.add(best.id);
    const app = best.appName ?? 'Unknown App';
    appCounts.set(app, (appCounts.get(app) ?? 0) + 1);
    for (const t of best.tags ?? []) seenTags.add(String(t).toLowerCase());
  }

  return selected;
}

const args = parseArgs(process.argv);
ensureDir(args.outDir);

console.log(`Collecting ${args.query} inspiration...`);
console.log(`Platform: ${args.platform}, Limit: ${args.limit}`);
console.log(`Output: ${args.outDir}`);
console.log(`Resume: ${args.resume ? 'on' : 'off'}`);
console.log(
  `Download profile: c=${args.downloadConcurrency}, timeout=${args.downloadTimeoutMs}ms, retries=${args.downloadRetries}, profile=${args.downloadProfile ? 'on' : 'off'}`,
);
if (args.creative) {
  console.log(
    `Creative mode: on (per-query-limit=${args.creativePerQueryLimit}, max-per-app=${args.creativeMaxPerApp})`,
  );
}
console.log('');

// 1) Auth check
try {
  sh('mobbin', ['whoami']);
  console.log('✓ Authenticated with Mobbin');
} catch (e) {
  console.error('✗ Not logged in. Run: mobbin login');
  process.exit(1);
}

// 2) Search
let results;
let creativeMeta = null;
try {
  if (args.creative) {
    console.log(`Creative search for "${args.query}"...`);
    const collected = buildCreativeCandidates(args);
    results = pickCreativeResults(collected.candidates, args.limit, args.creativeMaxPerApp);
    creativeMeta = {
      mode: 'creative',
      sourceQuery: args.query,
      queriesUsed: collected.queries,
      perQuery: collected.perQuery,
      totalCandidates: collected.candidates.length,
      selected: results.map(r => ({
        id: r.id,
        appName: r.appName,
        title: r.title,
        matchedQueries: r.matchedQueries ?? [],
        creativityScore: r.creativityScore ?? 0,
      })),
    };
    fs.writeFileSync(path.join(args.outDir, 'creative-searches.json'), JSON.stringify(creativeMeta, null, 2), 'utf8');
    console.log(`✓ Creative mode selected ${results.length} screens from ${collected.candidates.length} candidates`);
  } else {
    console.log(`Searching for "${args.query}" screens...`);
    results = searchScreens(args.query, args, args.limit);
    console.log(`✓ Found ${results.length} screens`);
  }
} catch (e) {
  console.error('✗ Search failed:', e?.message ?? String(e));
  process.exit(1);
}

// Log IDs before download (for visibility and resume)
console.log('');
console.log('Screen IDs:');
for (const r of results) {
  const app = r.appName ?? 'Unknown App';
  const creativeSuffix = args.creative
    ? ` | score=${r.creativityScore ?? 0} | queries=${(r.matchedQueries ?? []).join(', ')}`
    : '';
  console.log(`  - ${app} : ${r.id}${creativeSuffix}`);
}

const state = args.resume ? loadState(args.outDir) : { downloaded: new Set(), rows: [], failures: [] };
if (!args.resume) {
  try {
    fs.rmSync(statePath(args.outDir), { force: true });
  } catch {}
}

// 3) Download each id
const rows = state.rows;
const failures = state.failures;

console.log('');
console.log('Downloading screens...');

for (const r of results) {
  const id = r.id;
  const app = r.appName ?? 'Unknown App';
  const url = r.url ?? `https://mobbin.com/screens/${id}`;

  if (state.downloaded.has(id)) {
    console.log(`  ↺ ${app} (already downloaded)`);
    continue;
  }

  let downloadedTo = '';
  try {
    // capture stdout to parse the output directory
    const out = sh('mobbin', buildDownloadArgs(id, args));
    const m = out.match(/Downloaded to:\s*(.+)$/m);
    downloadedTo = m?.[1]?.trim() ?? '';

    // Best effort: assume single-screen downloads => 01.png
    const pngPath = downloadedTo ? path.join(downloadedTo, '01.png') : '';

    rows.push({
      app,
      id,
      url,
      pngPath: pngPath ? `\`${pngPath}\`` : '`(unknown)`',
      notes: [
        ...(args.creative && r.matchedQueries?.length
          ? [`Matched queries: ${r.matchedQueries.join(', ')}`]
          : []),
        ...(args.creative && typeof r.creativityScore === 'number'
          ? [`Creativity score: ${r.creativityScore}`]
          : []),
      ],
    });
    state.downloaded.add(id);
    saveState(args.outDir, state);
    console.log(`  ✓ ${app}`);
  } catch (e) {
    // retry once
    try {
      const out = sh('mobbin', buildDownloadArgs(id, args));
      const m = out.match(/Downloaded to:\s*(.+)$/m);
      downloadedTo = m?.[1]?.trim() ?? '';
      const pngPath = downloadedTo ? path.join(downloadedTo, '01.png') : '';
      rows.push({
        app,
        id,
        url,
        pngPath: pngPath ? `\`${pngPath}\`` : '`(unknown)`',
        notes: [
          ...(args.creative && r.matchedQueries?.length
            ? [`Matched queries: ${r.matchedQueries.join(', ')}`]
            : []),
          ...(args.creative && typeof r.creativityScore === 'number'
            ? [`Creativity score: ${r.creativityScore}`]
            : []),
        ],
      });
      state.downloaded.add(id);
      saveState(args.outDir, state);
      console.log(`  ✓ ${app} (retry)`);
    } catch (e2) {
      failures.push({ app, id, error: e2?.message ?? String(e2) });
      saveState(args.outDir, state);
      console.log(`  ✗ ${app} — failed`);
    }
  }
}

writeIndex(args.outDir, args.query, rows, failures);
console.log('');
console.log(`✓ Done! Downloaded ${rows.length}/${results.length} screens`);
console.log(`  Index: ${path.join(args.outDir, 'INDEX.md')}`);
if (creativeMeta) {
  console.log(`  Creative search details: ${path.join(args.outDir, 'creative-searches.json')}`);
}
if (failures.length) {
  console.log(`  Failed: ${failures.length}`);
}
