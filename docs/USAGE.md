# Mobbin CLI — Usage

## Install (dev)

```bash
cd mobbin-cli
npm i
```

## Tests

```bash
npm test
```

## Login

```bash
npm run dev -- login
```

This opens a real browser so you can complete login + 2FA. Session cookies are saved locally.
If your stored session expires, protected commands (`whoami`, `search`, `download`, `benchmark-download`)
automatically launch this login flow and then continue.

## Logout

```bash
npm run dev -- logout
```

Clears stored session data (cookies and the Playwright profile).

## Search

```bash
npm run dev -- search "fintech kyc minimal" --platform ios --limit 20
npm run dev -- search "checkout bottom sheet" --json
```

## Download

```bash
npm run dev -- download <id> --out ./inspo --concurrency 4

# Print timing summary and tune direct request behavior
npm run dev -- download <id> --out ./inspo --concurrency 4 --timeout-ms 15000 --retries 1 --profile
```

## Benchmark Download Throughput

Benchmark multiple concurrency values and get a recommendation based on median wall time:

```bash
npm run dev -- benchmark-download <id> --out ./bench --concurrency-list 2,4,6,8 --runs 2 --repeat 8

# Benchmark browser fallback only (skips direct image requests)
npm run dev -- benchmark-download <id> --out ./bench-fallback --concurrency-list 1,2,4 --runs 1 --repeat 4 --force-fallback
```

JSON output:

```bash
npm run dev -- benchmark-download <id> --out ./bench --concurrency-list 2,4,6,8 --json
```

## Sniff (endpoint discovery helper)

This opens Mobbin in a Playwright browser and logs likely-relevant XHR/fetch traffic to an **NDJSON** file.

```bash
npm run dev -- sniff
```

You can specify an output path:

```bash
npm run dev -- sniff --out ./mobbin-sniff.ndjson
```

Tips:

- Run `mobbin login` first so the sniff browser already has your session.
- The CLI uses **installed Google Chrome** (Playwright `channel: 'chrome'`) to reduce the chance of Google/Mobbin blocking the automation browser.
- In the opened browser tab, perform the actions you care about (search, open a flow, open a screen).
- The CLI prints one-line summaries and writes detailed request/response JSON (best effort) to the file.

If you still see a Google warning like **"This browser or app may not be secure"**:

- Don’t try to sign into Google inside `mobbin sniff`.
- Instead, sign in once via `mobbin login` (interactive), then re-run `mobbin sniff` using the saved session.
