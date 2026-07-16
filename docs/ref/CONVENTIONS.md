# Project doc conventions
These files are plain markdown. Fonts and sizes are rendering choices,
not file properties; structure is the style.
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
