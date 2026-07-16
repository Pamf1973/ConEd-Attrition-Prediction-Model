# Project doc conventions
These files are plain markdown. Fonts and sizes are rendering choices,
not file properties; structure is the style.

## Filename convention (for docs/ intake)

`YYYY-MM-DD_[origin_][type_]topic.ext`

- **origin** is optional. Omit when Ed authored the content. Include only for external sources (ismael, pedro, fable, coned, johan, ildi, web, etc.).
- **type** is optional. Omit when the containing folder already implies it 1:1 (`docs/briefs/` implies brief, `docs/decks/` implies deck, `docs/design/` implies design, etc.).
- **topic** is required. kebab-case, 2-5 words.

Examples:
- `docs/briefs/2026-07-13_pedro-frontend-build.md` (Ed's brief to Pedro; origin+type both implied)
- `docs/ref/2026-07-16_methodology-alignment.md` (Ed's analysis; origin+type both implied)
- `docs/ref/2026-07-13_ismael-q1-q10-response.md` (from Ismael; origin included)
- `docs/ref/2026-07-16_fable-roadmap.md` (from Fable; origin included)


- Dates ISO (2026-07-16), times 24h. Timestamps come from a clock,
  never estimated.
- No emojis. No em dashes. Sentence case headings.
- Telegraphic entries: fragments fine, one to three lines per item,
  never restate what is unchanged.
- IDs: R = roadmap items, D = decisions, Q = questions. Reference IDs
  instead of repeating rationale. Every fact lives in exactly one file.
- STATE_LOG.md and DECISIONS.md are append-only. Never edit or delete
  an existing entry.
- PROJECT_STATE.md is rewritten only by the sync process, one person
  syncing at a time. Teammates contribute through the Team Updates
  section only.
- Team Updates entry format (humans or agents):
  - YYYY-MM-DD | name | what changed, with sha or PR number for any
    code claim | agreed or pending items | blockers
  Reference R-items when known. Code claims must cite a sha or PR so
  sync can verify. Unverifiable claims get logged as claims, not facts.
