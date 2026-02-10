---
name: mobbin-skill
description: Collect UI inspiration for any screen type from Mobbin using the local `mobbin` CLI. Use when the user asks to fetch/download Mobbin screens for inspiration (e.g., login, onboarding, homepage, settings, profile, checkout, search, notifications, etc.). Organizes screens per-app folder and generates an index for design reference.
---

# Mobbin UI Inspiration

## Preconditions

- `mobbin` must be installed and on PATH (global `npm link`)
- Session handling is automatic:
  - `whoami`, `search`, `download`, and `benchmark-download` auto-run `mobbin login` when session is expired.
  - For unattended runs, login first to avoid interactive pauses: `mobbin login`

## Parameters

When the user requests Mobbin inspiration, identify:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `screenType` | (required) | The type of screen to search for (e.g., "Login", "Onboarding", "Homepage", "Settings", "Profile", "Checkout", "Search", "Notifications", "Dashboard", "Empty State", "Error", "Loading") |
| `platform` | `ios` | Target platform: `ios`, `android`, or `web` |
| `limit` | `15` | Number of results to fetch |
| `outputDir` | `./inspiration/mobbin/<screenType>` | Where to save downloaded screens |
| `downloadConcurrency` | `8` | Concurrency passed to `mobbin download` (future-proof; useful as flow support expands) |
| `downloadTimeoutMs` | `15000` | Direct image request timeout before browser fallback |
| `downloadRetries` | `1` | Direct image request retries |

## Common screen types

- **Authentication**: Login, Sign Up, Forgot Password, OTP/Verification, SSO
- **Onboarding**: Welcome, Feature Tour, Permissions, Personalization
- **Navigation**: Homepage, Dashboard, Tab Bar, Sidebar, Bottom Navigation
- **User**: Profile, Settings, Account, Preferences, Edit Profile
- **Commerce**: Checkout, Cart, Payment, Product Detail, Order History
- **Content**: Feed, Search, Search Results, Filters, Detail View
- **Communication**: Notifications, Messages, Chat, Inbox
- **States**: Empty State, Error, Loading, Success, Offline
- **Actions**: Modal, Bottom Sheet, Action Sheet, Popup, Toast

## Default workflow

1) Verify auth

```bash
mobbin whoami
```

Note: if the stored session is expired, this command will automatically launch `mobbin login` and continue.

2) Search for screens (replace `<screenType>` with user's request)

```bash
mobbin search "<screenType>" --platform <platform> --limit <limit> --json > results.json
```

Examples:
```bash
# Onboarding screens
mobbin search "Onboarding" --platform ios --limit 15 --json > results.json

# Settings screens
mobbin search "Settings" --platform ios --limit 15 --json > results.json

# Homepage/Dashboard screens
mobbin search "Homepage" --platform ios --limit 15 --json > results.json

# Empty state screens
mobbin search "Empty State" --platform ios --limit 15 --json > results.json
```

3) Download each result id

- For each `id` in `results.json`, run:

```bash
mobbin download <screenId> \
  --out ./inspiration/mobbin/<screenType> \
  --concurrency 8 \
  --timeout-ms 15000 \
  --retries 1 \
  --profile
```

Notes:
- `mobbin download` takes the search result/flow id (not a screenshot id).
- `mobbin download` creates per-app folders automatically.
- `--profile` prints timing stats per download run; keep it on during collection for visibility.
- Prefer continuing on failures (retry once; then log).
- Use lowercase, hyphenated folder names (e.g., `empty-state`, `sign-up`)

Optional: tune concurrency first with benchmark mode (especially for larger collections):

```bash
mobbin benchmark-download <screenId> \
  --out ./tmp/bench \
  --concurrency-list 4,8,12,16 \
  --runs 2 \
  --repeat 24
```

4) Create an index markdown

Create `./inspiration/mobbin/<screenType>/INDEX.md` with:

```markdown
# <ScreenType> UI Inspiration

Collected from Mobbin on <date>

| App | Screen ID | Local Path | Notes |
|-----|-----------|------------|-------|
| <App Name> | [<id>](https://mobbin.com/screens/<id>) | `./path/to/01.png` | <2-3 key observations> |
```

Key observations to note per screen type:

- **Login/Auth**: SSO options, password visibility toggle, error states, biometric options
- **Onboarding**: Number of steps, skip option, progress indicator, value proposition
- **Homepage**: Navigation pattern, content hierarchy, personalization, CTAs
- **Settings**: Grouping strategy, toggle patterns, destructive actions placement
- **Profile**: Avatar handling, edit patterns, stats display, privacy options
- **Checkout**: Steps/progress, payment options, trust signals, form validation
- **Search**: Filter UI, recent/suggested, results layout, empty state
- **Notifications**: Grouping, actions, read/unread states, settings access
- **Empty States**: Illustration style, messaging, CTA prominence

## Fast path (script)

Use the bundled script for automated runs:

```bash
node mobbin-skill/scripts/gather-inspiration.mjs \
  --query "<screenType>" \
  --platform ios \
  --limit 15 \
  --out ./inspiration/mobbin/<screenType>
```

Examples:
```bash
# Onboarding inspiration
node mobbin-skill/scripts/gather-inspiration.mjs \
  --query "Onboarding" \
  --platform ios \
  --limit 15 \
  --out ./inspiration/mobbin/onboarding

# Settings inspiration
node mobbin-skill/scripts/gather-inspiration.mjs \
  --query "Settings" \
  --platform ios \
  --limit 15 \
  --out ./inspiration/mobbin/settings

# Creative onboarding for logging (query expansion + diversity ranking)
node mobbin-skill/scripts/gather-inspiration.mjs \
  --query "Onboarding for logging" \
  --platform web \
  --limit 20 \
  --out ./inspiration/mobbin/onboarding-logging \
  --creative \
  --creative-per-query-limit 10 \
  --creative-max-per-app 2
```

Creative mode notes:
- `--creative` expands the query into related terms and merges candidates.
- `--creative-max-per-app` enforces app diversity to avoid repetitive results.
- `--creative-query-pack "Onboarding,Welcome,Activity Log,Journal,History"` lets you override inferred keywords.
- Script writes `creative-searches.json` with the expanded query set, per-query hit counts, and selected scores.

## CLI reference (from `mobbin --help`)

Search syntax:

```bash
mobbin search <query> --platform ios|android|web --limit <n> --json
```

Download syntax (efficient profile):

```bash
mobbin download <id> --out <dir> --concurrency 8 --timeout-ms 15000 --retries 1 --profile
```

Benchmark syntax:

```bash
mobbin benchmark-download <id> --out <dir> --concurrency-list 4,8,12,16 --runs 2 --repeat 24
```

## Output conventions

- Root: `./inspiration/mobbin/<screenType>/`
- Per-app folder (as created by CLI): `./inspiration/mobbin/<screenType>/<App Name>/…`
- Per-screen folder: whatever `mobbin download` prints as "Downloaded to: …"
- Image filename: `01.png` (for single-screen downloads)
- Index file: `./inspiration/mobbin/<screenType>/INDEX.md`

## Multi-screen collection

To collect inspiration for multiple screen types in one session:

```bash
# Collect full user journey
for type in "Login" "Onboarding" "Homepage" "Settings"; do
  mobbin search "$type" --platform ios --limit 10 --json > "${type,,}-results.json"
  # Download each and organize
done
```

## If it fails

- If commands report session/auth issues, rerun once and complete interactive login when prompted.
- If `mobbin download` fails due to asset URLs: ensure your linked version includes direct URL ranking + 3-dot menu → "Download png" browser fallback.
- Rebuild/relink the CLI if needed:

```bash
cd mobbin-cli
npm run build
npm link
```
