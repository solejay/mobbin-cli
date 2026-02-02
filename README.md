# mobbin-cli

Playwright-assisted TypeScript CLI for searching Mobbin and downloading design inspiration.

- Docs: `./docs/ARCHITECTURE.md`
- Usage: `./docs/USAGE.md`

## Status
Scaffolded and builds. The remaining work is **endpoint discovery** for Mobbin’s internal search + flow + asset APIs.

## Install (macOS)

### One-liner (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/solejay/mobbin-cli/main/install.sh | bash
```

### Manual install from GitHub

```bash
npm i -g github:solejay/mobbin-cli
mobbin --help
```

### Dev / local linking

If you’re hacking on the repo:

```bash
git clone https://github.com/solejay/mobbin-cli
cd mobbin-cli
npm i
npm run build
npm link

mobbin --help
```

### Update after pulling changes (linked dev)

```bash
cd mobbin-cli
npm i
npm run build
npm link
```

### Unlink

```bash
npm unlink -g mobbin-cli
```

## Dev
```bash
cd mobbin-cli
npm i
npm run build
npm run dev -- --help
```
