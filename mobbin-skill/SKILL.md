---
name: mobbin-skill
description: Collect UI inspiration from Mobbin using the local `mobbin` CLI. Use when the user asks to search/download Mobbin inspiration for screen types (login, onboarding, homepage, settings, profile, checkout, search, notifications, etc.), especially when organizing downloaded references into per-app folders with an INDEX.
---

# Mobbin UI Inspiration

## Preconditions

- `mobbin` must be installed and on PATH (global `npm link`)
- Use grouped commands (current CLI): `auth`, `shots`, `app screens`, `config`
- Use profile `default` by default (avoid accidental `test` profile)

Authenticate first:

```bash
mobbin auth login --profile default
```

## Parameters

When collecting inspiration, identify:

| Parameter | Default | Description |
|---|---|---|
| `screenType` | (required) | Target UI type (Login, Onboarding, Homepage, Settings, etc.) |
| `platform` | `ios` | `ios`, `android`, or `web` |
| `limit` | `15` | Number of search results |
| `outputDir` | `./inspiration/mobbin/<screenType>` | Output root directory |
| `authProfile` | `default` | Mobbin auth profile (use `default` unless explicitly overridden) |
| `downloadMode` | `app-screens` | `app-screens` (recommended) or `shots` |
| `downloadConcurrency` | `8` | Download concurrency |
| `downloadTimeoutMs` | `15000` | Direct request timeout before browser fallback |
| `downloadRetries` | `1` | Direct request retries |

## Default workflow

1) Verify auth

```bash
mobbin auth status --profile default
```

If not logged in:

```bash
mobbin auth login --profile default
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
  --profile default \
  --concurrency 8 \
  --timeout-ms 15000 \
  --retries 1 \
  --max-scrolls 60 \
  --scroll-wait-ms 900 \
  --timing
```

### Optional: single screen/shot

Use only when you already have a screen URL or screen UUID:

```bash
mobbin shots download "https://mobbin.com/screens/<screen-id>" \
  --out ./inspiration/mobbin/<screenType> \
  --profile default \
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
  --profile default
```

Optional flags:

```bash
--download-mode app-screens|shots
--max-scrolls 60
--scroll-wait-ms 900
--no-creative
--creative-per-query-limit 10
--creative-max-per-app 2
--verify-min-score 3
```

## Current CLI reference

```bash
mobbin auth login --profile default
mobbin auth status --profile default
mobbin auth logout --profile default

mobbin search <query> --platform ios|android|web --limit <n> --json

mobbin shots download <screen-id-or-screen-url> --out <dir> --profile default --timing

mobbin app screens download --url <app-screens-url> --out <dir> --profile default --max-scrolls 60 --scroll-wait-ms 900 --timing

mobbin config get defaultProfile
mobbin config set defaultProfile default
```

## Troubleshooting

- `Not logged in`: run `mobbin auth login --profile default`
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
