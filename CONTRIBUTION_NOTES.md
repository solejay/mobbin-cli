# Contribution Notes: Installation Fixes

This repo supports a one-liner install via `install.sh`.

## Why the installer clones + builds

Installing directly from git URLs (`npm i -g github:…`) can be fragile because:
- lifecycle scripts may run during npm's "git dep preparation" in a temp clone
- some environments don't include `dist/` as expected

So the installer does:
1) uninstall any broken global install
2) clone to a temp folder
3) `npm install` + `npm run build`
4) `npm install -g .`
5) `npx playwright install chromium`

If you prefer publishing to npm later, we can simplify this a lot.
