# Design

The visual and interaction rules behind the interface. Read this before adding
a component, so new UI looks like it belongs.

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

## Components

Primitives live in `src/lib/components/ui/`.

**Controls.** The `.control` class is the shared shape for every button.
`.control-primary` inverts it for the single most likely action in a view.

**Toggle** is a square checkbox, not a sliding switch. A pill with a travelling
knob is the one shape that cannot be squared off without looking broken. A real
`<input type="checkbox">` also gets keyboard, focus, and screen-reader
behaviour for free.

Prefer `title` over a `description` line. A permanent second line under every
toggle makes a settings panel harder to scan, not easier.

**Panel** is the right-hand slide-over used by Share and Settings. It handles
its own focus move, focus restore on close, Escape, and scrim dismissal.

### Writing classes in Svelte

Use the array form for conditional classes:

```svelte
<span class={["block text-sm", disabled && "text-muted"]}>
```

Do **not** combine a `class="…"` attribute containing an arbitrary value with a
`class:` directive on the same element. `prettier-plugin-tailwindcss` mangles
that combination while rewriting the arbitrary value and has leaked the
rewritten class name into the element's text content.

## Icons

[Lucide](https://lucide.dev/), imported per icon so unused ones are never
bundled:

```svelte
import Settings from "@lucide/svelte/icons/settings";
```

14px beside text, 15px standalone. Lucide's rounded caps are kept — squaring
them makes joins spike at small sizes, and stroke caps are not element corners.

The wordmark uses `code-xml`, the same glyph as `static/icon.svg`. Keep those
two in step.

## Voice

Say what happened and what it means for the reader's work.

- **"Synced", not "Live".** "Live" described the socket; people want to know
  their work is safe.
- **No state is alarming.** Offline is not data loss here — the copy says
  changes are saved locally and will sync.
- **Errors name a next step.** "No pad here", plus why it might have happened
  and a way back — not "Internal Error".
- Sentence case everywhere except section headings, which are uppercase with
  wide tracking.

## Accessibility

- Interactive elements are real elements; native semantics beat ARIA.
- Focus is a 2px inset `--color-ink` outline, never removed without replacement.
- Presence is never colour alone — swatches carry names in `title`, and the
  count is spelled out ("You + 2 others"). This is also why initials chips were
  dropped: two-letter codes from generated names collide and communicate
  nothing.
- Colour choices target 4.5:1 for body text and 3:1 for large text and UI.
