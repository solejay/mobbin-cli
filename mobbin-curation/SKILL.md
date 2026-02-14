---
name: mobbin-curation
description: Curate downloaded Mobbin inspiration into designer-friendly outputs (INDEX summaries, app grouping, quick contact sheets, and relevance notes). Use after download steps when the user asks to organize, preview, or compare inspiration sets.
---

# Mobbin Curation

## Goals

- Make downloaded inspiration easy to browse
- Keep per-app grouping intact
- Produce fast previews for discussion and review

## Workflow

1) Build/refresh index

- Create or update `INDEX.md` in the inspiration root
- Include: app name, source URL, local path, and short observations

2) Add relevance notes

- Tag entries by UX intent (auth, onboarding, settings, checkout, etc.)
- Prefer concise notes: hierarchy, CTA clarity, state handling, interaction pattern

3) Generate quick visual preview

- Create a contact sheet from downloaded images when requested
- Save contact sheet in output root and reference it in `INDEX.md`

4) Keep failures visible

- Record failed entries in a `## Failed` section with minimal reason and retry status

## Output conventions

- Root: `./inspiration/mobbin/<screenType>/`
- Index: `INDEX.md`
- Preview: `contact-sheet.jpg` (or similarly named preview file)

## Quality bar

- No broken paths in index
- Notes are specific (not generic adjectives)
- Coverage is diverse across apps (avoid repetitive picks)
