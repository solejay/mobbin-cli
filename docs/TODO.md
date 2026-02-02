# TODO (Mobbin CLI)

## Tomorrow
- Run `mobbin login` to save a valid session (handles 2FA).
- Run `mobbin sniff` to capture Mobbin network calls:
  - Perform a search
  - Open a flow/result
  - Open an individual screen
- Save the generated `.ndjson` file and share it back here so we can wire up:
  - `MobbinClient.search()`
  - `MobbinClient.getFlow()`
  - `MobbinClient.listFlowAssets()` (prefer full-res)
- Then verify end-to-end:
  - `mobbin search "..."`
  - `mobbin download <id> --out ./inspo`

## Notes
- Sniff logs likely-relevant XHR/fetch traffic (GraphQL / `/api` / search-ish URLs) and writes NDJSON under `~/.config/mobbin-cli/` by default.
- If the session is missing/expired, re-run `mobbin login`.
