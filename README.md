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

## Mobbin Skill Packs (OpenClaw / Claude Code / Codex / Gemini)

This repo includes reusable skill packs:

- `mobbin-skill/` (general inspiration workflow)
- `mobbin-app-screens/` (full app collection downloader)
- `mobbin-auth-profiles/` (profile/session troubleshooting)
- `mobbin-curation/` (post-download curation workflow)

Each pack is self-contained (`SKILL.md` + optional scripts), so you can plug them into any assistant/tooling that supports custom skills or prompt-pack workflows.

### Generic install (any assistant)

From this repo root, copy the packs into your assistant's configured skills directory:

```bash
mkdir -p <your-skills-dir>
cp -R mobbin-skill mobbin-app-screens mobbin-auth-profiles mobbin-curation <your-skills-dir>/
```

Then reload/restart your assistant session.

### OpenClaw example

```bash
mkdir -p ~/clawd/skills
cp -R mobbin-skill mobbin-app-screens mobbin-auth-profiles mobbin-curation ~/clawd/skills/
```

### Notes for Claude Code / Codex / Gemini users

- If your setup supports directory-based custom skills/prompts, place these folders in that configured location.
- If not, you can still use them as runbooks: read each `SKILL.md` and run any referenced script directly (for example `mobbin-skill/scripts/gather-inspiration.mjs`).

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
