---
name: mobbin-auth-profiles
description: Manage Mobbin CLI auth sessions and profile routing (`default`, `test`, etc.). Use when login/session errors appear, when commands fail with "Not logged in", or when switching/repairing profile-specific sessions.
---

# Mobbin Auth & Profiles

## Diagnose quickly

1) Check active/default profile

```bash
mobbin config get defaultProfile
mobbin config path
```

2) Check auth status for target profile

```bash
mobbin auth status --profile <name>
```

3) If invalid, re-login profile

```bash
mobbin auth login --profile <name>
```

## Common fixes

### Set stable default profile

```bash
mobbin config set defaultProfile default
```

### Force explicit profile per command

```bash
mobbin auth status --profile default
mobbin shots download <screen-url-or-id> --out <dir> --profile default --timing
mobbin app screens download --url <app-screens-url> --out <dir> --profile default --timing
```

### Logout and reset profile session

```bash
mobbin auth logout --profile <name>
mobbin auth login --profile <name>
```

## Notes

- Profile-specific storage state is used under `~/.config/mobbin-cli/profiles/<name>/...`.
- `search` uses resolved profile from config/env/default; keep `defaultProfile` correct to avoid mismatches.
