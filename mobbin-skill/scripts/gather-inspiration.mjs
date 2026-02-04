#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const out = { query: null, platform: 'ios', limit: 15, outDir: null, resume: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--query' && next) (out.query = next), i++;
    else if (a === '--platform' && next) (out.platform = next), i++;
    else if (a === '--limit' && next) (out.limit = Number(next)), i++;
    else if (a === '--out' && next) (out.outDir = next), i++;
    else if (a === '--no-resume') out.resume = false;
    else if (a === '--help') {
      console.log(`Usage:
  gather-inspiration.mjs --query "<screenType>" --platform ios --limit 15 --out ./inspiration/mobbin/<screenType> [--no-resume]

Examples:
  gather-inspiration.mjs --query "Login" --platform ios --limit 15 --out ./inspiration/mobbin/login
  gather-inspiration.mjs --query "Onboarding" --platform ios --limit 20 --out ./inspiration/mobbin/onboarding
  gather-inspiration.mjs --query "Settings" --platform android --limit 10 --out ./inspiration/mobbin/settings
  gather-inspiration.mjs --query "Empty State" --platform ios --limit 15 --out ./inspiration/mobbin/empty-state

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

const args = parseArgs(process.argv);
ensureDir(args.outDir);

console.log(`Collecting ${args.query} inspiration...`);
console.log(`Platform: ${args.platform}, Limit: ${args.limit}`);
console.log(`Output: ${args.outDir}`);
console.log(`Resume: ${args.resume ? 'on' : 'off'}`);
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
try {
  console.log(`Searching for "${args.query}" screens...`);
  const json = sh('mobbin', [
    'search',
    args.query,
    '--platform',
    args.platform,
    '--limit',
    String(args.limit),
    '--json',
  ]);
  results = JSON.parse(json);
  console.log(`✓ Found ${results.length} screens`);
} catch (e) {
  console.error('✗ Search failed:', e?.message ?? String(e));
  process.exit(1);
}

// Log IDs before download (for visibility and resume)
console.log('');
console.log('Screen IDs:');
for (const r of results) {
  const app = r.appName ?? 'Unknown App';
  console.log(`  - ${app} : ${r.id}`);
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
    const out = sh('mobbin', ['download', id, '--out', args.outDir]);
    const m = out.match(/Downloaded to:\s*(.+)$/m);
    downloadedTo = m?.[1]?.trim() ?? '';

    // Best effort: assume single-screen downloads => 01.png
    const pngPath = downloadedTo ? path.join(downloadedTo, '01.png') : '';

    rows.push({
      app,
      id,
      url,
      pngPath: pngPath ? `\`${pngPath}\`` : '`(unknown)`',
      notes: [],
    });
    state.downloaded.add(id);
    saveState(args.outDir, state);
    console.log(`  ✓ ${app}`);
  } catch (e) {
    // retry once
    try {
      const out = sh('mobbin', ['download', id, '--out', args.outDir]);
      const m = out.match(/Downloaded to:\s*(.+)$/m);
      downloadedTo = m?.[1]?.trim() ?? '';
      const pngPath = downloadedTo ? path.join(downloadedTo, '01.png') : '';
      rows.push({ app, id, url, pngPath: pngPath ? `\`${pngPath}\`` : '`(unknown)`', notes: [] });
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
if (failures.length) {
  console.log(`  Failed: ${failures.length}`);
}
