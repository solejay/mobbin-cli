# Mobbin CLI — Usage

## Install (dev)

```bash
cd mobbin-cli
npm i
```

## Login

```bash
npm run dev -- login
```

This opens a real browser so you can complete login + 2FA. Session cookies are saved locally.

## Search

```bash
npm run dev -- search "fintech kyc minimal" --platform ios --limit 20
npm run dev -- search "checkout bottom sheet" --json
```

> Search is currently a stub until we implement Mobbin endpoint discovery.

## Download

```bash
npm run dev -- download <id> --out ./inspo --concurrency 4
```

> Download is currently a stub until we implement flow + asset endpoints.

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
