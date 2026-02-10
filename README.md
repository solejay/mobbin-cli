# mobbin-cli

Playwright-assisted CLI for searching Mobbin and downloading design inspiration.

## Install (macOS)

```bash
curl -fsSL -L https://raw.githubusercontent.com/solejay/mobbin-cli/main/install.sh | bash
```

## Requirements

- Node.js >= 18.18
- Playwright chromium browser (`npx playwright install chromium`)

## Usage

```bash
mobbin --help

# Authenticate (opens a browser)
mobbin login

# Logout (clears stored session)
mobbin logout

# Check auth
mobbin whoami

# Search for screens
mobbin search "login" --limit 10

# Download assets for a screen id
mobbin download <id> --out ./mobbin-downloads

# Benchmark download performance across concurrency values
mobbin benchmark-download <id> --out ./bench --concurrency-list 2,4,6,8 --runs 2 --repeat 8
```

If your saved Mobbin session expires, `whoami`, `search`, `download`, and `benchmark-download`
automatically run the login flow and then continue.

Troubleshooting: see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
