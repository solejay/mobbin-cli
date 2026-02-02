# Mobbin CLI — Architecture & Build Plan

## Goal

A TypeScript CLI that:

- Logs into **Mobbin.com** (paid account, often with 2FA)
- Searches for app design inspiration based on a user query
- Downloads screens in **full resolution** (best available) organized **by app → by flow**

> Note on access/ToS: Mobbin is a paid product and assets may be licensed/restricted. The CLI should only download content your account is permitted to access and should fail gracefully when blocked.

---

## Strategy (practical + robust)

### 1) Interactive login is the source of truth

- Command: `mobbin login`
- Implementation: Playwright (headed)
- You complete login + 2FA manually.
- The CLI saves Playwright `storageState.json` containing cookies + localStorage.

### 2) Network-first for search + metadata

- After login, the CLI prefers calling Mobbin’s internal JSON/GraphQL endpoints using stored cookies.
- This is faster and less brittle than DOM scraping.

### 3) Full-res downloads with a fallback ladder

Downloads are the most fragile part. Use a ladder:

1. **Best case:** API returns full-res image URLs directly.
2. **If URLs are signed/short-lived:** refresh asset list and retry.
3. **Fallback:** Playwright headless “network sniffing” for the screen page to capture the largest image URL requested.

---

## CLI UX (commands)

### Auth

- `mobbin login` — interactive login in a real browser
- `mobbin whoami` — confirm auth (once we wire a real endpoint)
- `mobbin logout` — deletes local session state (optional)

### Search

- `mobbin search "fintech kyc minimal" --platform ios --limit 20`
- `mobbin search "checkout bottom sheet" --json`

### Download

- `mobbin download <flowId> --out ./inspo --concurrency 4`

---

## Output structure

```
./inspo/
  Revolut/
    KYC - Identity Verification/
      01.png
      02.png
      03.png
      meta.json
```

`meta.json` captures provenance and URLs so you can re-run and verify later.

---

## Components (modules)

### `auth/`

- `loginInteractive()` → launches Playwright headed, saves `storageState.json`
- `cookieHeaderFromStorageState()` → converts cookies to `Cookie:` header for `fetch`

### `api/`

- `MobbinClient` (thin wrapper)
  - `search(query, filters)`
  - `getFlow(id)`
  - `listFlowAssets(flow)`
  - `whoami()` (auth verification)

### `download/`

- `downloadFlow(flow, assets, opts)`
  - concurrency-limited downloads
  - validates content-type is `image/*` (avoid saving HTML login pages)

---

## Endpoint discovery (the only missing piece)

Mobbin likely uses either REST JSON endpoints or GraphQL. To implement `search/getFlow/listFlowAssets`, you can do this manually or via the built-in sniffer.

### Option A — built-in sniffer (recommended)

Run:

```bash
mobbin sniff
```

(or in dev: `npm run dev -- sniff`)

Then, in the opened browser tab:

1. Perform a search
2. Open a result/flow
3. Open an individual screen (if applicable)

This writes an **NDJSON** log file (default under `~/.config/mobbin-cli/`) containing:

- Request URL + method + headers
- Request postData (if any)
- Response status + headers
- Response body for JSON and Next.js RSC payloads (`text/x-component`) (truncated)

From that file we identify:

- search endpoint + payload (GraphQL query/variables)
- flow detail endpoint
- screen asset endpoint (where the full-res image URL comes from)

### Option B — DevTools manual

1. Login to Mobbin in a browser.
2. Open DevTools → Network.
3. Perform a search.
4. Find the request that returns JSON results (often `graphql` or `/api/...`).
5. Record:
   - URL
   - method (POST/GET)
   - request payload (for GraphQL)
   - required headers (CSRF token, etc.)

Then implement those in `MobbinClient`.

---

## Build milestones

### Milestone 1 (end-to-end skeleton)

- `mobbin login` saves storageState
- `mobbin search` wired (once endpoints known)
- `mobbin download` downloads assets (once asset endpoint known)

### Milestone 2 (resilience)

- signed URL refresh
- Playwright fallback ladder for downloads

### Milestone 3 (polish)

- progress UI
- caching
- better filters + prompt expansion

---

## Local dev

- `npm run dev` — run CLI via tsx
- `npm run build` — build to `dist/`
- `node dist/cli.js --help`
