---
name: mobbin-skill
description: Collect UI inspiration from Mobbin using the local `mobbin` CLI. Use when the user asks to search/download Mobbin inspiration for screen types (login, onboarding, homepage, settings, profile, checkout, search, notifications, etc.), especially when organizing downloaded references into per-app folders with an INDEX.
---

# Mobbin UI Inspiration

## Preconditions

- `mobbin` must be installed and on PATH (global `npm link`)
- Use grouped commands (current CLI): `auth`, `shots`, `app screens`, `config`
- Auth is **not auto-login**. Authenticate first:

```bash
mobbin auth login --profile <name>
```

If you omit `--profile`, CLI resolves profile from config/env/default.

## Parameters

When collecting inspiration, identify:

| Parameter | Default | Description |
|---|---|---|
| `screenType` | (required) | Target UI type (Login, Onboarding, Homepage, Settings, etc.) |
| `platform` | `ios` | `ios`, `android`, or `web` |
| `limit` | `15` | Number of search results |
| `outputDir` | `./inspiration/mobbin/<screenType>` | Output root directory |
| `authProfile` | config/env/default | Mobbin auth profile |
| `downloadMode` | `app-screens` | `app-screens` (recommended) or `shots` |
| `downloadConcurrency` | `8` | Download concurrency |
| `downloadTimeoutMs` | `15000` | Direct request timeout before browser fallback |
| `downloadRetries` | `1` | Direct request retries |

## Default workflow

1) Verify auth

```bash
mobbin auth status --profile <name>
```

If not logged in:

```bash
mobbin auth login --profile <name>
```

2) Search

```bash
mobbin search "<screenType>" --platform <platform> --limit <limit> --json > results.json
```

3) Download inspiration

### Recommended: full app screen collections

For each result URL in `results.json` (`url` field):

```bash
mobbin app screens download \
  --url "<appScreensUrl>" \
  --out ./inspiration/mobbin/<screenType> \
  --profile <name> \
  --concurrency 8 \
  --timeout-ms 15000 \
  --retries 1 \
  --timing
```

### Optional: single screen/shot

Use only when you already have a screen URL or screen UUID:

```bash
mobbin shots download "https://mobbin.com/screens/<screen-id>" \
  --out ./inspiration/mobbin/<screenType> \
  --profile <name> \
  --concurrency 8 \
  --timeout-ms 15000 \
  --retries 1 \
  --timing
```

4) Write `INDEX.md`

Create `./inspiration/mobbin/<screenType>/INDEX.md`:

```markdown
# <ScreenType> UI Inspiration

Collected from Mobbin on <date>

| App | Source | Local Path | Notes |
|-----|--------|------------|-------|
| <App Name> | [link](<mobbin-url>) | `./path/to/folder/or/file` | <2-3 observations> |
```

## Fast path (script)

```bash
node mobbin-skill/scripts/gather-inspiration.mjs \
  --query "<screenType>" \
  --platform ios \
  --limit 15 \
  --out ./inspiration/mobbin/<screenType> \
  --profile <name>
```

Optional flags:

```bash
--download-mode app-screens|shots
--no-creative
--creative-per-query-limit 10
--creative-max-per-app 2
--verify-min-score 3
```

## Current CLI reference

```bash
mobbin auth login --profile <name>
mobbin auth status --profile <name>
mobbin auth logout --profile <name>

mobbin search <query> --platform ios|android|web --limit <n> --json

mobbin shots download <screen-id-or-screen-url> --out <dir> --profile <name> --timing

mobbin app screens download --url <app-screens-url> --out <dir> --profile <name> --timing

mobbin config get defaultProfile
mobbin config set defaultProfile default
```

## Troubleshooting

- `Not logged in`: run `mobbin auth login --profile <name>`
- Wrong default profile:
  ```bash
  mobbin config set defaultProfile default
  ```
- `shots download` invalid id message: pass a `/screens/<uuid>` URL or use `app screens download` for `/apps/.../screens` URLs.
- Rebuild/relink CLI:
  ```bash
  cd mobbin-cli
  npm run build
  npm link
  ```
