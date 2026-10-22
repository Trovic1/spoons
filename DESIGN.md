# Design

World: **Low Power**. Today's energy is a phone battery, with one cell per spoon. The interface is a standard, calm task app, and the world shows up only in palette, type, density and one signature element: the battery.

## Tokens (src/index.css)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--ground` | #eeede8 | #131311 | Page ground, warm grey tinted toward amber |
| `--surface` | #fbfaf7 | #1c1b18 | Panels, inputs, battery casing interior |
| `--ink` | #1c1b18 | #f0eee7 | Text, battery casing, primary buttons |
| `--ink-2` | #57544b | #aba79c | Secondary text, hints |
| `--line` | #d6d3c8 | #34322c | Dividers, borders, empty cells |
| `--power` | #f2c230 | #f2c230 | **Low power only**: the check-in band and cells on ≤3-spoon days, the logo, selection. Never decoration. |
| `--must` / `--should` / `--could` | ink / #4f6273 / #b8c3cc | light / #8ea4b8 / #48525a | Planned cell and priority-pill colours |
| `--risk` / `--risk-soft` | #b8382a / #f6e1dd | #ff8a74 / #3a211c | At-risk must-dos only |
| `--help` / `--help-soft` | #2c5f7a / #dde9ef | #8cc3dd / #1b2c34 | Help routing; focus ring |
| `--hatch` | #c9c5b8 | #4a4740 | Reserve cell hatching |
| `--band-bg` / `--band-ink` | ink / surface | #23221e / ink | Check-in band; it stays dark in dark mode |

Modes: `data-contrast="high"` collapses secondary ink into ink and uses 2px borders. `data-font="lexend"` swaps in Lexend with +0.02em tracking.

## Type

One family, **Atkinson Hyperlegible Next** (400/500/700/800), self-hosted with Fontsource. It was chosen for low-vision legibility, not style. Weights carry hierarchy: 800 for headings and counts, 700 for labels and buttons. Tabular numerals are scoped to `.num`. The scale is fixed rem; only the check-in heading uses clamp.

## Components

- **Battery** (`components/Battery.tsx`): 3px ink casing, radius 14, and a tip nub. Segments are flex items with `flex-grow = spoon cost`, animated over 420ms ease-out-expo so the day visibly reflows. The segment order is spent, then planned, then free, then reserve. Spent cells are a dim fill with a diagonal cross-out; free cells are outlined; reserve is hatched. Overflow chips sit past the tip on desktop and in a row under the battery on mobile.
- **Check-in band**: an ink band with a 48px round stepper and a large count. It turns `--power` on low power days.
- **Plan row**: priority pill, then title and meta, then mini cost cells and number, then Done and remove. Done opens an inline "how many spoons did it really take?" picker with the planned value focused.
- **Overflow groups**: an icon, title and count, then a hint, then items with a ghost-pill action. The message opens inline in a soft help or risk panel with a primary Copy button.
- **Buttons**: pill shapes. Primary is ink; line is a 1.5px ink outline; quiet is text only. Minimum height is 44px (40px inside rows).
- **Segmented radios** for cost, priority, theme and reserve; native checkboxes with ink accent.

## Rules

- Yellow means low energy. Do not use it anywhere else.
- Every leftover task needs a next step, and the copy never blames the user.
- No modals: forms, pickers and messages open inline.
- Motion conveys state only (battery reflow, row entry) and is disabled under reduced motion.
