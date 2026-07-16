# State Log

Append-only. Never edit or delete entries. Written by /sync (git batches), /note (verbal), /roadmap-adjust (plan changes). Compacted by /compact-log after 45 days.

Entry format:
```
YYYY-MM-DD HH:MM | <sha_range | verbal (who) | roadmap> | Terse description. Roadmap IDs. Decision IDs.
```

Examples:
```
2026-07-14 16:05 | verbal (call: Ed, Ismael, Pedro) | Pedro defers auth to next sprint. Affects R6.
2026-07-15 09:12 | a1b2c3..f9e8d7 | Ismael: pipeline refactor landed, 3 modules. Advances R3. Confirms verbal 2026-07-14. New dep: joblib.
2026-07-15 10:40 | roadmap | R3 expanded. Impact notes added to R5, R7. See D9.
```

---
