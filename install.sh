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

GLOBAL_BIN="$(npm bin -g)"
GLOBAL_ROOT="$(npm root -g)"

echo ""
echo "npm global bin:  ${GLOBAL_BIN}"
echo "npm global root: ${GLOBAL_ROOT}"

echo "Installing Playwright chromium browser…"
# Use npx so it resolves the installed Playwright package
npx playwright install chromium

# Refresh shell command cache (best effort)
hash -r 2>/dev/null || true

if command -v mobbin >/dev/null 2>&1; then
  echo ""
  echo "✓ mobbin-cli installed successfully"
  mobbin --help | head -n 3 || true
  echo ""
  echo "Try: mobbin login"
  exit 0
fi

# If we get here, the binary likely exists but PATH doesn't include npm's global bin.
if [[ -x "${GLOBAL_BIN}/mobbin" ]]; then
  echo ""
  echo "✓ mobbin-cli installed, but your shell PATH doesn't include npm's global bin."
  echo "Add this to your ~/.zshrc (or ~/.bashrc), then restart your terminal:"
  echo ""
  echo "  export PATH=\"${GLOBAL_BIN}:\$PATH\""
  echo ""
  echo "Then run: mobbin --help"
  exit 0
fi

echo ""
echo "✗ Installation failed: 'mobbin' not found."
echo "Debug:"
echo "  ls -la \"${GLOBAL_BIN}\" | grep mobbin || true"
exit 1

