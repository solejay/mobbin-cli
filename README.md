# mobbin-cli

Playwright-assisted TypeScript CLI for searching Mobbin and downloading design inspiration.

- Docs: `./docs/ARCHITECTURE.md`
- Usage: `./docs/USAGE.md`

## Status
Scaffolded and builds. The remaining work is **endpoint discovery** for Mobbin’s internal search + flow + asset APIs.

## Install / Link (use `mobbin` command)

This repo is a Node CLI. The easiest way to use it locally is via `npm link`.

```bash
git clone https://github.com/solejay/mobbin-cli
cd mobbin-cli
npm i
npm run build
npm link

# Now you can run:
mobbin --help
```

### Update after pulling changes

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
