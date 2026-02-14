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

## Mobbin Skill Packs (Assistant-agnostic)

This repo includes reusable skill packs:

- `mobbin-skill/` (general inspiration workflow)
- `mobbin-app-screens/` (full app collection downloader)
- `mobbin-auth-profiles/` (profile/session troubleshooting)
- `mobbin-curation/` (post-download curation workflow)

Each pack is self-contained (`SKILL.md` + optional scripts), so you can use them with any agent framework that supports custom skills/prompts.

### Install skill packs (generic)

From this repo root, copy the packs into your tool's configured skills/prompts directory:

```bash
mkdir -p <skills-dir>
cp -R mobbin-skill mobbin-app-screens mobbin-auth-profiles mobbin-curation <skills-dir>/
```

Then reload/restart your assistant session.

### Platform mapping examples

Use the same copy command, replacing `<skills-dir>` with your actual path:

- Claude Code: `<skills-dir>` = your configured Claude skills/prompts folder
- Codex: `<skills-dir>` = your configured Codex skills/prompts folder
- Gemini: `<skills-dir>` = your configured Gemini skills/prompts folder
- OpenClaw: `<skills-dir>` = `~/clawd/skills`

If your tool does not support folder-based skills, use these as runbooks: read each `SKILL.md` and run referenced scripts directly (for example `mobbin-skill/scripts/gather-inspiration.mjs`).

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
