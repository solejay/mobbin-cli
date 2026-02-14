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
    profile: 'default',
    resume: true,
    downloadMode: 'app-screens', // app-screens | shots
    downloadConcurrency: 8,
    downloadTimeoutMs: 15000,
    downloadRetries: 1,
    maxScrolls: 60,
    scrollWaitMs: 900,
    downloadTiming: true,
    creative: true,
    creativePerQueryLimit: 10,
    creativeMaxPerApp: 2,
    creativeQueryPack: null,
    verify: true,
    verifyMinScore: 3,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];

    if (a === '--query' && next) (out.query = next), i++;
    else if (a === '--platform' && next) (out.platform = next), i++;
    else if (a === '--limit' && next) (out.limit = Number(next)), i++;
    else if (a === '--out' && next) (out.outDir = next), i++;
    else if (a === '--profile' && next) (out.profile = next), i++;
    else if (a === '--download-mode' && next) (out.downloadMode = next), i++;
    else if (a === '--download-concurrency' && next) (out.downloadConcurrency = Number(next)), i++;
    else if (a === '--download-timeout-ms' && next) (out.downloadTimeoutMs = Number(next)), i++;
    else if (a === '--download-retries' && next) (out.downloadRetries = Number(next)), i++;
    else if (a === '--max-scrolls' && next) (out.maxScrolls = Number(next)), i++;
    else if (a === '--scroll-wait-ms' && next) (out.scrollWaitMs = Number(next)), i++;
    else if (a === '--no-download-timing') out.downloadTiming = false;
    else if (a === '--creative') out.creative = true;
    else if (a === '--no-creative') out.creative = false;
    else if (a === '--creative-per-query-limit' && next) (out.creativePerQueryLimit = Number(next)), i++;
    else if (a === '--creative-max-per-app' && next) (out.creativeMaxPerApp = Number(next)), i++;
    else if (a === '--creative-query-pack' && next) (out.creativeQueryPack = next), i++;
    else if (a === '--no-verify') out.verify = false;
    else if (a === '--verify-min-score' && next) (out.verifyMinScore = Number(next)), i++;
    else if (a === '--no-resume') out.resume = false;
    else if (a === '--help') {
      console.log(`Usage:
  gather-inspiration.mjs --query "<screenType>" --platform ios --limit 15 --out ./inspiration/mobbin/<screenType> [--profile default] [--no-resume]
    [--download-mode app-screens|shots]
    [--download-concurrency 8] [--download-timeout-ms 15000] [--download-retries 1]
    [--max-scrolls 60] [--scroll-wait-ms 900] [--no-download-timing]
    [--creative|--no-creative] [--creative-per-query-limit 10] [--creative-max-per-app 2]
    [--creative-query-pack "Onboarding,Welcome,Product Tour"]
    [--no-verify] [--verify-min-score 3]

Examples:
  gather-inspiration.mjs --query "Onboarding" --platform ios --limit 15 --out ./inspiration/mobbin/onboarding --profile default
  gather-inspiration.mjs --query "Settings" --platform android --limit 10 --out ./inspiration/mobbin/settings
  gather-inspiration.mjs --query "Onboarding for logging" --platform web --limit 20 --out ./inspiration/mobbin/onboarding-logging
  gather-inspiration.mjs --query "Onboarding" --platform ios --limit 10 --out ./inspiration/mobbin/onboarding-exact --no-creative
  gather-inspiration.mjs --query "Login" --platform ios --limit 10 --out ./inspiration/mobbin/login-shots --download-mode shots
  gather-inspiration.mjs --query "Onboarding" --out ./inspiration/mobbin/onboarding-large --max-scrolls 120 --scroll-wait-ms 1400
`);
      process.exit(0);
    }
  }

  if (!out.query) {
    console.error('Error: --query is required. Use --help for usage.');
    process.exit(1);
  }

  if (!out.outDir) {
    const slug = out.query.toLowerCase().replace(/\s+/g, '-');
    out.outDir = `./inspiration/mobbin/${slug}`;
  }

  if (!['app-screens', 'shots'].includes(out.downloadMode)) {
    console.error('Error: --download-mode must be app-screens or shots.');
    process.exit(1);
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
  if (!Number.isInteger(out.maxScrolls) || out.maxScrolls <= 0) {
    console.error('Error: --max-scrolls must be a positive integer.');
    process.exit(1);
  }
  if (!Number.isInteger(out.scrollWaitMs) || out.scrollWaitMs <= 0) {
    console.error('Error: --scroll-wait-ms must be a positive integer.');
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
  if (!Number.isInteger(out.verifyMinScore) || out.verifyMinScore < 0) {
    console.error('Error: --verify-min-score must be a non-negative integer.');
    process.exit(1);
  }

  return out;
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...opts,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
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
  lines.push('| App | Source | Local Path | Notes |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    const notes = (r.notes?.length ? r.notes.join('<br>') : '').replaceAll('|', '\\|');
    lines.push(`| ${r.app.replaceAll('|', '\\|')} | [${r.id}](${r.url}) | ${r.localPath} | ${notes} |`);
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

function inferIntent(query) {
  const q = String(query || '').toLowerCase();
  const logging = ['logging', 'log', 'journal', 'history', 'tracking', 'timeline', 'activity'];
  const auth = ['login', 'log in', 'sign in', 'signin', 'sign up', 'signup', 'auth', 'authentication', 'otp', 'sso'];
  const onboarding = ['onboarding', 'on board', 'welcome', 'first run', 'getting started', 'tutorial', 'intro', 'introduction'];

  if (logging.some(k => q.includes(k))) return 'logging';
  if (auth.some(k => q.includes(k))) return 'auth';
  if (onboarding.some(k => q.includes(k))) return 'onboarding';
  return 'general';
}

function relevanceTerms(intent) {
  if (intent === 'logging') {
    return {
      positiveStrong: ['onboarding', 'activity log', 'journal', 'history', 'timeline', 'tracking'],
      positiveWeak: ['welcome', 'getting started', 'first run', 'progress', 'goal', 'task', 'check-in'],
      negative: ['checkout', 'payment', 'wallet', 'billing', 'cart'],
    };
  }
  if (intent === 'auth') {
    return {
      positiveStrong: ['onboarding', 'login', 'sign up', 'signup', 'authentication', 'otp', 'sso'],
      positiveWeak: ['welcome', 'first run', 'getting started', 'permissions', 'guided tour'],
      negative: ['checkout', 'payment', 'wallet', 'billing', 'cart'],
    };
  }
  if (intent === 'onboarding') {
    return {
      positiveStrong: ['onboarding', 'welcome', 'getting started', 'first run', 'guided tour', 'tutorial', 'permissions'],
      positiveWeak: ['intro', 'introduction', 'feature tour', 'sign up', 'signup', 'login', 'personalization', 'progress'],
      negative: ['checkout', 'payment', 'wallet', 'billing', 'cart', 'charts', 'analytics'],
    };
  }
  return {
    positiveStrong: [],
    positiveWeak: [],
    negative: [],
  };
}

function countMatches(text, terms) {
  let hits = 0;
  for (const term of terms) {
    if (text.includes(term)) hits++;
  }
  return hits;
}

function computeRelevance(screen, query, intent) {
  const title = String(screen.title ?? '').toLowerCase();
  const tags = (screen.tags ?? []).map(t => String(t).toLowerCase());
  const matchedQueries = (screen.matchedQueries ?? []).map(q => String(q).toLowerCase());
  const text = [title, ...tags, ...matchedQueries].join(' | ');

  const terms = relevanceTerms(intent);
  const strongHits = countMatches(text, terms.positiveStrong);
  const weakHits = countMatches(text, terms.positiveWeak);
  const negativeHits = countMatches(text, terms.negative);

  const queryTokens = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2);
  const queryHits = queryTokens.filter(t => text.includes(t)).length;

  const score = strongHits * 4 + weakHits * 2 + queryHits - negativeHits * 3;
  return {
    score,
    strongHits,
    weakHits,
    queryHits,
    negativeHits,
  };
}

function annotateAndVerifyCandidates(candidates, args, intent) {
  const annotated = [];
  const rejected = [];
  for (const c of candidates) {
    const relevance = computeRelevance(c, args.query, intent);
    const withRel = { ...c, relevance };
    if (!args.verify || relevance.score >= args.verifyMinScore) {
      annotated.push(withRel);
    } else {
      rejected.push({
        id: c.id,
        appName: c.appName,
        title: c.title,
        relevance,
      });
    }
  }
  return { kept: annotated, rejected };
}

function searchScreens(query, args) {
  const json = sh('mobbin', [
    'search',
    query,
    '--platform',
    args.platform,
    '--limit',
    String(args.creative ? args.creativePerQueryLimit : args.limit),
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
      const found = searchScreens(query, args);
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
      const relevanceBonus = c.relevance?.score ?? 0;
      const score = relevanceBonus * 5 + novelTags * 2 + queryBonus + appBonus;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }

    if (!best) {
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

function buildDownloadArgs(result, args) {
  if (args.downloadMode === 'shots') {
    return [
      'shots',
      'download',
      result.id,
      '--out',
      args.outDir,
      '--concurrency',
      String(args.downloadConcurrency),
      '--timeout-ms',
      String(args.downloadTimeoutMs),
      '--retries',
      String(args.downloadRetries),
      '--profile',
      args.profile,
      ...(args.downloadTiming ? ['--timing'] : []),
    ];
  }

  return [
    'app',
    'screens',
    'download',
    '--url',
    result.url,
    '--out',
    args.outDir,
    '--concurrency',
    String(args.downloadConcurrency),
    '--timeout-ms',
    String(args.downloadTimeoutMs),
    '--retries',
    String(args.downloadRetries),
    '--max-scrolls',
    String(args.maxScrolls),
    '--scroll-wait-ms',
    String(args.scrollWaitMs),
    '--profile',
    args.profile,
    ...(args.downloadTiming ? ['--timing'] : []),
  ];
}

function parseDownloadedTo(stdout) {
  const m = String(stdout).match(/Downloaded to:\s*(.+)$/m);
  return m?.[1]?.trim() ?? '';
}

function detectFolderSummary(downloadedTo) {
  try {
    const metaPath = path.join(downloadedTo, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const count = Array.isArray(meta?.screens) ? meta.screens.length : 0;
      if (count > 0) return `${count} screens`;
    }

    const files = fs.readdirSync(downloadedTo);
    const imageCount = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).length;
    if (imageCount > 0) return `${imageCount} images`;
  } catch {
    // ignore
  }
  return 'downloaded';
}

const args = parseArgs(process.argv);
ensureDir(args.outDir);

if (args.profile) {
  process.env.MOBBIN_PROFILE = args.profile;
}

console.log(`Collecting ${args.query} inspiration...`);
console.log(`Platform: ${args.platform}, Limit: ${args.limit}`);
console.log(`Output: ${args.outDir}`);
console.log(`Profile: ${args.profile}`);
console.log(`Resume: ${args.resume ? 'on' : 'off'}`);
console.log(`Download mode: ${args.downloadMode}`);
console.log(
  `Download profile: c=${args.downloadConcurrency}, timeout=${args.downloadTimeoutMs}ms, retries=${args.downloadRetries}, timing=${args.downloadTiming ? 'on' : 'off'}`,
);
if (args.downloadMode === 'app-screens') {
  console.log(`App-screens scraping: max-scrolls=${args.maxScrolls}, scroll-wait-ms=${args.scrollWaitMs}`);
}
if (args.verify) {
  console.log(`Relevance verification: on (min-score=${args.verifyMinScore})`);
} else {
  console.log('Relevance verification: off');
}
if (args.creative) {
  console.log(
    `Creative mode: on (per-query-limit=${args.creativePerQueryLimit}, max-per-app=${args.creativeMaxPerApp})`,
  );
}
console.log('');

// 1) Auth check
try {
  const authArgs = ['auth', 'status', '--profile', args.profile];
  sh('mobbin', authArgs);
  console.log('✓ Authenticated with Mobbin');
} catch (e) {
  console.error(`✗ Not logged in. Run: mobbin auth login --profile ${args.profile}`);
  process.exit(1);
}

// 2) Search
let results;
let creativeMeta = null;
const intent = inferIntent(args.query);
try {
  if (args.creative) {
    console.log(`Creative search for "${args.query}"...`);
    const collected = buildCreativeCandidates(args);
    const verified = annotateAndVerifyCandidates(collected.candidates, args, intent);
    const pool = verified.kept.length
      ? verified.kept
      : collected.candidates.map(c => ({ ...c, relevance: computeRelevance(c, args.query, intent) }));
    results = pickCreativeResults(pool, args.limit, args.creativeMaxPerApp);
    creativeMeta = {
      mode: 'creative',
      sourceQuery: args.query,
      intent,
      verify: args.verify,
      verifyMinScore: args.verifyMinScore,
      queriesUsed: collected.queries,
      perQuery: collected.perQuery,
      totalCandidates: collected.candidates.length,
      verifiedCandidates: pool.length,
      rejectedByVerification: verified.rejected,
      selected: results.map(r => ({
        id: r.id,
        appName: r.appName,
        title: r.title,
        url: r.url,
        matchedQueries: r.matchedQueries ?? [],
        creativityScore: r.creativityScore ?? 0,
        relevanceScore: r.relevance?.score ?? 0,
      })),
    };
    fs.writeFileSync(path.join(args.outDir, 'creative-searches.json'), JSON.stringify(creativeMeta, null, 2), 'utf8');
    console.log(`✓ Creative mode selected ${results.length} screens from ${collected.candidates.length} candidates (verified pool ${pool.length})`);
  } else {
    console.log(`Searching for "${args.query}" screens...`);
    const strictResults = JSON.parse(
      sh('mobbin', [
        'search',
        args.query,
        '--platform',
        args.platform,
        '--limit',
        String(args.limit),
        '--json',
      ]),
    );
    const verified = annotateAndVerifyCandidates(strictResults, args, intent);
    results = verified.kept.length
      ? verified.kept
      : strictResults.map(c => ({ ...c, relevance: computeRelevance(c, args.query, intent) }));
    console.log(`✓ Found ${results.length} screens`);
  }
} catch (e) {
  console.error('✗ Search failed:', e?.message ?? String(e));
  process.exit(1);
}

console.log('');
console.log('Candidates:');
for (const r of results) {
  const app = r.appName ?? 'Unknown App';
  const target = args.downloadMode === 'app-screens' ? (r.url ?? '(missing-url)') : r.id;
  const creativeSuffix = args.creative
    ? ` | score=${r.creativityScore ?? 0} | relevance=${r.relevance?.score ?? 0} | queries=${(r.matchedQueries ?? []).join(', ')}`
    : '';
  console.log(`  - ${app} : ${target}${creativeSuffix}`);
}

const state = args.resume ? loadState(args.outDir) : { downloaded: new Set(), rows: [], failures: [] };
if (!args.resume) {
  try {
    fs.rmSync(statePath(args.outDir), { force: true });
  } catch {
    // ignore
  }
}

const rows = state.rows;
const failures = state.failures;

console.log('');
console.log('Downloading...');

for (const r of results) {
  const id = r.id;
  const app = r.appName ?? 'Unknown App';
  const url = r.url ?? `https://mobbin.com/screens/${id}`;

  if (state.downloaded.has(id)) {
    console.log(`  ↺ ${app} (already downloaded)`);
    continue;
  }

  if (args.downloadMode === 'app-screens' && !r.url) {
    failures.push({ app, id, error: 'Missing app screens URL in search result' });
    saveState(args.outDir, state);
    console.log(`  ✗ ${app} — missing app screens URL`);
    continue;
  }

  let downloadedTo = '';

  try {
    const out = sh('mobbin', buildDownloadArgs(r, args));
    downloadedTo = parseDownloadedTo(out);

    const summary = downloadedTo ? detectFolderSummary(downloadedTo) : 'downloaded';

    rows.push({
      app,
      id,
      url,
      localPath: downloadedTo ? `\`${downloadedTo}\`` : '`(unknown)`',
      notes: [
        `Mode: ${args.downloadMode}`,
        `Summary: ${summary}`,
        ...(args.creative && r.matchedQueries?.length ? [`Matched queries: ${r.matchedQueries.join(', ')}`] : []),
        ...(args.creative && typeof r.creativityScore === 'number' ? [`Creativity score: ${r.creativityScore}`] : []),
        ...(typeof r.relevance?.score === 'number' ? [`Relevance score: ${r.relevance.score}`] : []),
      ],
    });

    state.downloaded.add(id);
    saveState(args.outDir, state);
    console.log(`  ✓ ${app}`);
  } catch (e) {
    try {
      const out = sh('mobbin', buildDownloadArgs(r, args));
      downloadedTo = parseDownloadedTo(out);

      const summary = downloadedTo ? detectFolderSummary(downloadedTo) : 'downloaded';

      rows.push({
        app,
        id,
        url,
        localPath: downloadedTo ? `\`${downloadedTo}\`` : '`(unknown)`',
        notes: [
          `Mode: ${args.downloadMode}`,
          `Summary: ${summary}`,
          'Recovered on retry',
          ...(args.creative && r.matchedQueries?.length ? [`Matched queries: ${r.matchedQueries.join(', ')}`] : []),
          ...(args.creative && typeof r.creativityScore === 'number' ? [`Creativity score: ${r.creativityScore}`] : []),
          ...(typeof r.relevance?.score === 'number' ? [`Relevance score: ${r.relevance.score}`] : []),
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
console.log(`✓ Done! Downloaded ${rows.length}/${results.length} entries`);
console.log(`  Index: ${path.join(args.outDir, 'INDEX.md')}`);
if (creativeMeta) {
  console.log(`  Creative search details: ${path.join(args.outDir, 'creative-searches.json')}`);
}
if (failures.length) {
  console.log(`  Failed: ${failures.length}`);
}
