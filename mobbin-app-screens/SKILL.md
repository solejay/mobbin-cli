---
name: mobbin-app-screens
description: Download full screen collections from Mobbin app pages using `mobbin app screens download`. Use when the user provides or asks to use `/apps/<slug>/<versionId>/screens` URLs and wants all screens for an app/version saved locally.
---

# Mobbin App Screens Downloader

## Use this workflow

1) Verify auth/profile

```bash
mobbin auth status --profile <name>
```

If needed:

```bash
mobbin auth login --profile <name>
```

2) Download full collection from app screens URL

```bash
mobbin app screens download \
  --url "https://mobbin.com/apps/<slug>/<versionId>/screens" \
  --out <output-dir> \
  --profile <name> \
  --concurrency 8 \
  --timeout-ms 15000 \
  --retries 1 \
  --timing
```

3) Verify output

- Confirm output folder exists
- Confirm `meta.json` exists
- Confirm expected screen count in `meta.json.screens`

## Troubleshooting

- If command says `Not logged in`, run `mobbin auth login --profile <name>`.
- If no screens are found, rerun with visible browser:

```bash
mobbin app screens download --url <...> --out <dir> --profile <name> --headless false --timing
```

- If profile confusion occurs, check default profile:

```bash
mobbin config get defaultProfile
mobbin config set defaultProfile default
```
