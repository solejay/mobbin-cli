#!/usr/bin/env bash
set -euo pipefail

# macOS-only installer (per Segun)
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: This installer is macOS-only. Detected: $(uname -s)" >&2
  exit 1
fi

echo "Installing mobbin-cli…"

# Clean any previous/broken installs (ENOTDIR, stale dirs)
rm -rf "$(npm root -g)/mobbin-cli" 2>/dev/null || true
npm uninstall -g mobbin-cli 2>/dev/null || true

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

git clone https://github.com/solejay/mobbin-cli.git "$TEMP_DIR/mobbin-cli"
cd "$TEMP_DIR/mobbin-cli"

echo "Installing dependencies…"
npm install

echo "Building…"
npm run build

echo "Installing globally…"
npm install -g .

echo "Installing Playwright chromium browser…"
# Use npx so it resolves the installed Playwright package
npx playwright install chromium

if command -v mobbin >/dev/null 2>&1; then
  echo ""
  echo "✓ mobbin-cli installed successfully"
  mobbin --help | head -n 3 || true
  echo ""
  echo "Try: mobbin login"
else
  echo ""
  echo "✗ Installation failed: 'mobbin' not found on PATH."
  echo "Check: npm bin -g  (and ensure it's on your PATH)"
  exit 1
fi
