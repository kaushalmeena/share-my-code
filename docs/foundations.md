# Foundations

## Principle

**Flat, monochrome, square.** The pad is the product; the chrome around it
should be legible and then get out of the way. Two consequences drive nearly
every decision below:

- **Colour is reserved.** The UI is greyscale. Colour means one of two things:
  a participant's identity, or the brand mark. Nothing else is coloured, so a
  cursor in the margin is impossible to miss.
- **Nothing is rounded.** Every corner is square, enforced globally in
  `app.css`. Not a stylistic tic — it removes a variable, so a new component
  cannot look subtly off by picking the wrong radius.

## Tokens

Themes set seven variables. Everything else derives from them, so adding a
theme means writing seven values and nothing else.

| Token               | Role                                          |
| ------------------- | --------------------------------------------- |
| `--color-canvas`    | Page and editor background                    |
| `--color-surface`   | Raised or inset areas: panel headers, banners |
| `--color-line`      | Every 1px border and divider                  |
| `--color-ink`       | Primary text, and the "on" state of controls  |
| `--color-muted`     | Secondary text, placeholders, disabled labels |
| `--color-danger`    | Errors only                                   |
| `--color-selection` | Text selection and active-state fills         |

Two tokens sit outside the theme system and never change:

- `--color-brand` (`#4d7cff`) — the logo, the synced indicator. Fixed at mid
  luminance so it clears roughly 4:1 on white and 5:1 on black; one asset works
  in every theme and in a light or dark browser tab.
- The participant palette in `src/lib/utils/identity.ts` — eight hues chosen to
  stay legible as a 2px caret against every canvas.

Because the tokens are declared in Tailwind's `@theme`, they generate real
utilities. Write `text-muted`, not `text-(--color-muted)`.

## Themes

Five, plus `system`, which resolves to Paper or Ink from
`prefers-color-scheme`.

| Theme | Character                  |
| ----- | -------------------------- |
| Paper | Neutral light, default     |
| Sepia | Warm light, low glare      |
| Ink   | Neutral dark, default dark |
| Slate | Cool dark, blue-grey       |

A blocking script in `app.html` reads the stored theme and stamps
`data-theme` before first paint, so there is no flash of the wrong theme. It
validates against an allowlist — **add new themes there too**, or they fall
back to the system default.

Theme is a personal preference stored in `localStorage`, never shared with the
room.

### Editor themes

Editor styling lives in `src/lib/editor/themes.ts`, **not** in `app.css`.

CodeMirror injects its defaults as a `baseTheme` with generated class prefixes
that outrank ordinary selectors, so a stylesheet rule for `.cm-activeLine` is
silently ignored — which is exactly the bug that shipped CodeMirror's default
blue active line into a monochrome UI. Rules written through
`EditorView.theme()` win.

Structural colours reference the same CSS variables as the app chrome, so the
editor and its surroundings cannot drift apart. Only the syntax palette is
defined per theme.

## Typography

System sans for the UI, system mono for code, pad ids, and room links —
monospace signals "this is a value you might copy".

| Use              | Size                                      |
| ---------------- | ----------------------------------------- |
| Body, controls   | `text-sm`                                 |
| Secondary, chips | `text-xs`                                 |
| Section headings | `text-xs` uppercase, wide tracking, muted |
| Counters         | `text-[10px]`                             |

Editor font size is user-adjustable, 11–22px.
