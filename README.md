# mobbin-cli

Playwright-assisted CLI for searching Mobbin and downloading design inspiration.

## Install (macOS)

```bash
curl -fsSL -L https://raw.githubusercontent.com/solejay/mobbin-cli/main/install.sh | bash
```

## Requirements

- Node.js >= 18.18
- Playwright Chromium browser:

```bash
npx playwright install chromium
```

## CLI Usage (current grouped commands)

```bash
mobbin --help

# Authenticate
mobbin auth login --profile default
mobbin auth status --profile default

# Search
mobbin search "onboarding" --platform ios --limit 10 --json

# Download a single screen/shot (screen URL or screen UUID)
mobbin shots download "https://mobbin.com/screens/<screen-id>" \
  --out ./mobbin-downloads \
  --profile default \
  --timing

# Download full app screen collection (recommended)
mobbin app screens download \
  --url "https://mobbin.com/apps/<slug>/<versionId>/screens" \
  --out ./mobbin-downloads \
  --profile default \
  --timing

# Optional: set your default profile once
mobbin config set defaultProfile default
```

## Benchmarking

```bash
mobbin benchmark-download <id> \
  --out ./bench \
  --concurrency-list 2,4,6,8 \
  --runs 2 \
  --repeat 8
```

## Mobbin Skills (OpenClaw)

This repo includes ready-to-use skill packs:

- `mobbin-skill/` (general inspiration workflow)
- `mobbin-app-screens/` (full app collection downloader)
- `mobbin-auth-profiles/` (profile/session troubleshooting)
- `mobbin-curation/` (post-download curation workflow)

### Install skill locally

From this repo root:

```bash
mkdir -p ~/clawd/skills
cp -R mobbin-skill ~/clawd/skills/
```

Install all Mobbin skill packs:

```bash
mkdir -p ~/clawd/skills
cp -R mobbin-skill mobbin-app-screens mobbin-auth-profiles mobbin-curation ~/clawd/skills/
```

If your OpenClaw setup loads skills on startup, restart/reload your agent session after copying.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
