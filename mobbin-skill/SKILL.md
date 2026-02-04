---
name: mobbin-skill
description: Collect UI inspiration for any screen type from Mobbin using the local `mobbin` CLI. Use when the user asks to fetch/download Mobbin screens for inspiration (e.g., login, onboarding, homepage, settings, profile, checkout, search, notifications, etc.). Organizes screens per-app folder and generates an index for design reference.
---

# Mobbin UI Inspiration

## Preconditions

- `mobbin` must be installed and on PATH (global `npm link`)
- User must be logged in:
  - Check: `mobbin whoami`
  - If not logged in: `mobbin login` (interactive)

## Parameters

When the user requests Mobbin inspiration, identify:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `screenType` | (required) | The type of screen to search for (e.g., "Login", "Onboarding", "Homepage", "Settings", "Profile", "Checkout", "Search", "Notifications", "Dashboard", "Empty State", "Error", "Loading") |
| `platform` | `ios` | Target platform: `ios`, `android`, or `web` |
| `limit` | `15` | Number of results to fetch |
| `outputDir` | `./inspiration/mobbin/<screenType>` | Where to save downloaded screens |

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
mobbin download <screenId> --out ./inspiration/mobbin/<screenType>
```

Notes:
- `mobbin download` takes the search result/flow id (not a screenshot id).
- `mobbin download` creates per-app folders automatically.
- Prefer continuing on failures (retry once; then log).
- Use lowercase, hyphenated folder names (e.g., `empty-state`, `sign-up`)

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
node skills/mobbin-skill/scripts/gather-inspiration.mjs \
  --query "<screenType>" \
  --platform ios \
  --limit 15 \
  --out ./inspiration/mobbin/<screenType>
```

Examples:
```bash
# Onboarding inspiration
node skills/mobbin-skill/scripts/gather-inspiration.mjs \
  --query "Onboarding" \
  --platform ios \
  --limit 15 \
  --out ./inspiration/mobbin/onboarding

# Settings inspiration
node skills/mobbin-skill/scripts/gather-inspiration.mjs \
  --query "Settings" \
  --platform ios \
  --limit 15 \
  --out ./inspiration/mobbin/settings
```

## CLI reference (from `mobbin --help`)

Search syntax:

```bash
mobbin search <query> --platform ios|android|web --limit <n> --json
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

- If `mobbin download` fails due to asset URLs: ensure your linked version includes the 3-dot menu → "Download png" Playwright fallback.
- Rebuild/relink the CLI if needed:

```bash
cd mobbin-cli
npm run build
npm link
```
