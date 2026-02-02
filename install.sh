#!/usr/bin/env bash
set -euo pipefail

REPO="solejay/mobbin-cli"
PKG="github:${REPO}"

say() { printf "%s\n" "$*"; }
fail() { printf "ERROR: %s\n" "$*" >&2; exit 1; }

# macOS only (per Segun)
if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "This installer is macOS-only. Detected: $(uname -s)"
fi

# Require Node + npm
command -v node >/dev/null 2>&1 || fail "node is required. Install Node.js (recommend: https://nodejs.org/) and re-run."
command -v npm  >/dev/null 2>&1 || fail "npm is required (comes with Node). Install Node.js and re-run."

say "Installing mobbin-cli from ${PKG} …"

# Use npm global install from GitHub
# Note: this will run package.json lifecycle scripts (incl. postinstall)
npm i -g "${PKG}"

# Ensure playwright browser bits are installed (package also runs playwright install in postinstall,
# but we re-run defensively so the CLI works immediately).
# (No harm if already installed.)
if command -v mobbin >/dev/null 2>&1; then
  say "Verifying install…"
  mobbin --help >/dev/null
  say "✅ Installed. Try: mobbin whoami"
else
  fail "Install completed but 'mobbin' not found on PATH. Try restarting your terminal or check npm global bin path: npm bin -g"
fi
