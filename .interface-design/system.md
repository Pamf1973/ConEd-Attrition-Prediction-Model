# system.md — extracted 2026-08-18

Scope: `src/next/*` (new build). Legacy excluded. This is the codified surface, not aspiration. Fable Round 0/1 supplied the atoms; `system-v1.1.md` supplies the laws.

## Tokens (from `.sc-scope` in ScoreCell.css)

**Canvas**
- `--sc-canvas` `#0C0F13`
- `--sc-canvas-raised` `#12161C`
- body background `#030D1A` (**mismatch — reconcile in nav bundle**)

**Ink**
- `--sc-bench-text` `#E6E8EB`
- `--sc-bench-muted` `#8A919C`
- `--sc-bench-line` `#232A33`

**Semantic**
- low `#4C8A68` · med `#D19A3D` · high `#E05545` · crit `#C22B1F` · uncertain `#7A828D`

**Accent**
- Used only in `.tw-compose-btn` and `.cp-ai-tag` — `#ea580c` (ConEd orange). Sparingly. Not a "brand color everywhere" — an action color.

**Type**
- UI: Inter / system-ui
- Data + labels: `--sc-mono` IBM Plex Mono
- Signature micro-label: mono, 9–10px, `text-transform: uppercase`, `letter-spacing: 0.06–0.10em`, `--sc-bench-muted`. Used for eyebrows, chip labels, section headers, palette footer, kind tags. **Load-bearing pattern.**

## Spacing

Base 4px. Observed scale: **4, 6, 8, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80**. No deviation. Section gap is 48px, body pad 40px/32px, card pad 28px, row pad 10–18px.

## Radius

Deliberately un-rounded.
- Inputs: `border-radius: 0` (login inputs literally set it to zero)
- Chips: 2–3px
- Small buttons / palette hint: 4px
- Primary buttons / palette panel: 6–8px

Rule: **corners get less round as the element gets smaller / more workbench-adjacent.** Login card, pulse tiles, feed rows — all sharp (no radius).

## Depth

**Borders-only.** One shadow in the entire new build: `.cp-panel` (`0 20px 60px rgba(0,0,0,0.35)`) — reserved for the palette overlay. Everywhere else, hierarchy = 1px solid on `--sc-bench-line`, with dashed variant for empty/placeholder states. Any new depth (login card lift, topbar seat) should stay borders + tone shift, not shadow.

## Component patterns

- **Card:** `--sc-canvas-raised` + `1px solid --sc-bench-line` + 28px pad + no radius
- **Tile (pulse):** same as card + `border-top: 3px solid <semantic>` for tier signaling
- **Input:** mono 14px, `border-radius: 0`, focus = swap border to `--sc-bench-text`, no shadow
- **Primary button (compose):** Inter 13px 600, 10×18 pad, radius 6, accent bg, hover mixes 88% accent + 12% black
- **Secondary button (submit-login):** mono 12px uppercase 0.06em, inverted (bench-text bg on canvas-raised text)
- **Chip:** mono 9px uppercase 0.06em, 1px border, 2–3px radius, 2×6 pad
- **Row (feed event):** grid `80px 1fr auto`, 12px gap, 11×18 pad, 1px bottom border
- **Palette panel:** 560px max, radius 8, the one exception with shadow

## Motion (current state)

Codified motion in the new build: **one line.** `.tw-compose-btn { transition: background 0.12s ease }`. That's it. No route transitions, no chart-mount animations, no palette open/close motion, no shimmer, no hover fades. This is greenfield for the bundle.

## Voice cues embedded in CSS

- Dashed borders = uncomputed / unverified / placeholder (`.tw-gate`, `.tw-placeholder`, `.sc-chip--stale`, `.sc-err`). Never use dashed for anything with real data.
- Uncertain tier uses a **striped** repeating gradient on its tick — visual "not-solid." Any motion for uncertain states should honor: uncertain ≠ still, but also ≠ smooth.
- Accent orange only appears on things the user can *do* (compose, AI action). Not on things the system *shows*.

## Implications for the deferred-bundle work

1. **Login v2 dissolve:** must resolve inside 600ms into an actual `.sc-canvas` surface, monochrome (bench-text on canvas), no accent, no color. Reconcile the `#030D1A` body / `#0C0F13` canvas mismatch as part of it.
2. **Global topbar:** existing `.tw-topbar` is the template — inherit its eyebrow + title + right-anchors pattern; route-aware only in the middle slot. Do NOT introduce a shadow. Border-bottom on `--sc-bench-line` continues the depth language.
3. **Motion language proposal (tokens to add):**
   - `--sc-motion-fast: 120ms` (button hover, focus swap — matches existing compose button)
   - `--sc-motion-med: 180ms` (route crossfade, palette open, chart bar grow once-on-mount)
   - `--sc-motion-easing: cubic-bezier(0.2, 0, 0, 1)` (ease-out; never spring, never bounce — corners are sharp, motion should match)
   - Rule: **animate on mount, never on re-render.** Filter changes = instant. Data updates = instant. Only first appearance gets motion.
4. **Shimmer:** if adopted, single-hue (a lighter tone of `--sc-canvas-raised`, not accent, not rainbow), sweep once per 1.2s, only during indeterminate compute (`/api/model_meta` refresh, LLM-leg pending in palette). Stops the instant state resolves. No shimmer on static labels/wordmarks.
