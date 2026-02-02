# mobbin-cli Troubleshooting

## 1) ENOTDIR error on reinstall

**Symptom**

```
ENOTDIR: not a directory, rename '.../lib/node_modules/mobbin-cli' -> '.../.mobbin-cli-XXXX'
```

**Cause**: a broken previous install left a file/symlink where npm expects a directory.

**Fix**

```bash
rm -rf "$(npm root -g)/mobbin-cli"
# optional
npm cache clean --force
```

Then rerun the installer.

## 2) `mobbin: command not found`

**Cause**: npm global bin directory not on PATH (common with nvm).

**Check**

```bash
npm bin -g
ls -la "$(npm bin -g)"
```

If `mobbin` is present there, add the npm global bin directory to your shell PATH.

## 3) Playwright browser missing

**Fix**

```bash
npx playwright install chromium
```

## 4) Permission issues installing globally

Prefer npm via nvm (no sudo). If you installed Node system-wide and need it:

```bash
sudo npm i -g github:solejay/mobbin-cli
```
