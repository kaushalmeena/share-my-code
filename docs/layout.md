# Layout and motion

## Layout

The room is a fixed three-part column: a 48px header, the editor filling the
remaining height, and a 32px footer. Only the editor scrolls.

Controls share a **32px box**. Header buttons are explicitly `h-8` so a row of
them lines up regardless of whether each contains an icon, a label, or both —
without it, every button sizes to its own content and the row looks ragged.

Panels are 384px, full width on small screens.

### Responsive

Progressive disclosure by width, so nothing overflows:

| Breakpoint | Adds                          |
| ---------- | ----------------------------- |
| base       | Title, Share, Settings        |
| `sm`       | Wordmark, status, Share label |
| `md`       | Presence, language name       |

## Motion

Three durations and one easing, in `app.css`. Use the tokens, not literals.

| Token             | Value | For                         |
| ----------------- | ----- | --------------------------- |
| `--duration-fast` | 120ms | Hover, focus, control state |
| `--duration-base` | 180ms | Status changes, theme swaps |
| `--duration-slow` | 240ms | Panels entering and leaving |

`prefers-reduced-motion` zeroes all three globally. Svelte transitions take
numbers rather than CSS variables, so those components read
`prefersReducedMotion` from `svelte/motion` directly.

Motion is only ever used to explain where something came from — a panel flies
in from the edge it is anchored to. Nothing animates for decoration.
