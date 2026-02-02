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

# Install from GitHub.
# We intentionally disable lifecycle scripts here because npm's git-dependency preparation
# can run scripts before deps are in place, causing flaky installs.
# We'll run the Playwright browser install explicitly afterwards.
npm i -g --ignore-scripts "${PKG}"

# Install Playwright browser binaries using the globally-installed package location.
GLOBAL_ROOT="$(npm root -g)"
PW_CLI="${GLOBAL_ROOT}/mobbin-cli/node_modules/playwright/cli.js"

if [[ -f "${PW_CLI}" ]]; then
  say "Installing Playwright browsers… (this can take a minute)"
  node "${PW_CLI}" install
else
  say "Warning: Playwright CLI not found at ${PW_CLI}. Skipping browser install."
  say "If mobbin fails later, run: npx playwright install"
fi

if command -v mobbin >/dev/null 2>&1; then
  say "Verifying install…"
  mobbin --help >/dev/null
  say "✅ Installed. Try: mobbin whoami"
else
  fail "Install completed but 'mobbin' not found on PATH. Try restarting your terminal or check npm global bin path: npm bin -g"
fi
