# mobbin-cli

Playwright-assisted CLI for searching Mobbin and downloading design inspiration.

## Install (macOS)

```bash
curl -fsSL -L https://raw.githubusercontent.com/solejay/mobbin-cli/main/install.sh | bash
```

## Usage

```bash
mobbin --help

# Authenticate (opens a browser)
mobbin login

# Check auth
mobbin whoami

# Search for screens
mobbin search "login" --limit 10

# Download assets for a screen id
mobbin download --screen-id <id> --out ./mobbin-downloads
```

Troubleshooting: see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
