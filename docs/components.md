# Components, icons and voice

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
