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

echo "Packaging…"
# Avoid parsing npm pack output (which can include script logs).
rm -f ./*.tgz
npm pack >/dev/null
TARBALL="$(ls -t ./*.tgz 2>/dev/null | head -n 1 | tr -d '[:space:]')"
if [[ -z "${TARBALL}" ]]; then
  echo "ERROR: npm pack did not produce a tarball" >&2
  exit 1
fi

echo "Installing globally…"
# Install from the tarball so the global install COPIES files (avoids symlinks to the source dir).
npm install -g "${TARBALL}"

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

  # Best-effort: persist PATH update automatically (macOS default shell is zsh).
  ZSHRC="$HOME/.zshrc"
  ZPROFILE="$HOME/.zprofile"
  BASHRC="$HOME/.bashrc"
  PROFILE="$HOME/.profile"
  MARK_START="# >>> mobbin-cli installer >>>"
  MARK_END="# <<< mobbin-cli installer <<<"
  BLOCK="${MARK_START}\n# Added by mobbin-cli installer so the 'mobbin' command is available\nexport PATH=\"${GLOBAL_BIN}:\$PATH\"\n${MARK_END}\n"

  add_block() {
    local file="$1"
    if [[ -f "$file" ]] && grep -Fq "$MARK_START" "$file"; then
      return 0
    fi
    printf "\n%s\n" "$BLOCK" >> "$file"
  }

  # Update zsh + common login shell files.
  add_block "$ZSHRC"
  add_block "$ZPROFILE"
  [[ -f "$BASHRC" ]] && add_block "$BASHRC"
  [[ -f "$PROFILE" ]] && add_block "$PROFILE"

  echo "Updated shell config to include npm global bin in PATH:"
  echo "  ${ZSHRC}"
  echo "  ${ZPROFILE}"
  [[ -f "$BASHRC" ]] && echo "  ${BASHRC}"
  [[ -f "$PROFILE" ]] && echo "  ${PROFILE}"
  echo ""
  echo "Open a NEW terminal tab (or run: source ~/.zshrc) then try: mobbin --help"
  echo "If it still isn't found, check whether you're using a different Node version in the new shell (nvm)."
  exit 0
fi

echo ""
echo "✗ Installation failed: 'mobbin' not found."
echo "Debug:"
echo "  ls -la \"${GLOBAL_BIN}\" | grep mobbin || true"
exit 1
