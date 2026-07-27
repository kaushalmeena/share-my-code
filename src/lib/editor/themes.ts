import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import type { ResolvedThemeId, ThemeId } from "$lib/types";

/**
 * Editor themes, hand-written to match the app chrome.
 *
 * Structural colours (background, gutters, selection) come from the CSS
 * variables in `app.css` so the editor and the surrounding UI can never drift
 * apart. Only the syntax palette is defined here.
 */

type SyntaxPalette = {
  comment: string;
  keyword: string;
  string: string;
  number: string;
  name: string;
  type: string;
  operator: string;
  invalid: string;
};

const PALETTES: Record<ResolvedThemeId, SyntaxPalette> = {
  paper: {
    comment: "#8a8a8a",
    keyword: "#8a3ffc",
    string: "#0f7b6c",
    number: "#b44a00",
    name: "#1f4fd8",
    type: "#005a8e",
    operator: "#5a5a5a",
    invalid: "#b42318"
  },
  sepia: {
    comment: "#9c8f78",
    keyword: "#8c4a1f",
    string: "#3f6b3a",
    number: "#a5521b",
    name: "#2f5a86",
    type: "#6b4a86",
    operator: "#6d6152",
    invalid: "#a5321b"
  },
  ink: {
    comment: "#6f6f6f",
    keyword: "#c58aff",
    string: "#79d4b4",
    number: "#f0a06a",
    name: "#7fb0ff",
    type: "#6fc7e8",
    operator: "#a0a0a0",
    invalid: "#ff6b60"
  },
  slate: {
    comment: "#657789",
    keyword: "#b48cff",
    string: "#7fd6a8",
    number: "#f2ab6d",
    name: "#78b4f5",
    type: "#63cfd8",
    operator: "#95a7ba",
    invalid: "#ff7a6e"
  }
};

/**
 * Structural styling shared by every theme, driven entirely by CSS variables.
 *
 * This has to be an `EditorView.theme` rather than plain CSS in `app.css`:
 * CodeMirror injects its own defaults as a `baseTheme` with generated class
 * prefixes that outrank ordinary selectors, so a stylesheet rule for, say,
 * `.cm-activeLine` silently loses. Theme rules win.
 */
const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--color-canvas)",
    color: "var(--color-ink)"
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6"
  },
  ".cm-content": {
    caretColor: "var(--color-ink)",
    padding: "12px 0"
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
    color: "var(--color-ink)"
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--color-ink)",
    borderLeftWidth: "2px"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "var(--color-selection)"
    },
  ".cm-gutters": {
    backgroundColor: "var(--color-canvas)",
    color: "var(--color-muted)",
    border: "none",
    borderRight: "1px solid var(--color-line)"
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 12px 0 16px",
    minWidth: "48px"
  },
  ".cm-panels": {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-ink)",
    borderTop: "1px solid var(--color-line)"
  },
  ".cm-searchMatch": {
    backgroundColor: "var(--color-selection)",
    outline: "1px solid var(--color-line)"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    outline: "1px solid var(--color-ink)"
  },
  ".cm-tooltip": {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-line)",
    color: "var(--color-ink)"
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--color-selection)",
    color: "var(--color-ink)"
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-line)",
    color: "var(--color-muted)"
  },
  // Remote participants, drawn by y-codemirror.next. Its own styles are also
  // a baseTheme, so these overrides belong here for the same reason.
  ".cm-ySelectionInfo": {
    fontFamily: "var(--font-sans)",
    fontSize: "10px",
    fontWeight: "500",
    padding: "1px 4px",
    // Upstream fades name tags out; keeping them visible is more useful when
    // several people are in the same file.
    opacity: "1",
    top: "-1.2em"
  },
  ".cm-ySelectionCaret": {
    borderLeftWidth: "2px",
    borderRightWidth: "0"
  }
});

function highlightStyle(palette: SyntaxPalette) {
  return HighlightStyle.define([
    {
      tag: [t.comment, t.lineComment, t.blockComment],
      color: palette.comment,
      fontStyle: "italic"
    },
    {
      tag: [t.keyword, t.modifier, t.controlKeyword, t.moduleKeyword],
      color: palette.keyword
    },
    { tag: [t.string, t.special(t.string), t.regexp], color: palette.string },
    { tag: [t.number, t.bool, t.null, t.atom], color: palette.number },
    {
      tag: [t.variableName, t.propertyName, t.attributeName],
      color: palette.name
    },
    {
      tag: [t.function(t.variableName), t.function(t.propertyName)],
      color: palette.name
    },
    {
      tag: [t.typeName, t.className, t.namespace, t.tagName],
      color: palette.type
    },
    {
      tag: [t.operator, t.punctuation, t.separator, t.bracket],
      color: palette.operator
    },
    { tag: [t.definition(t.variableName)], color: palette.name },
    { tag: t.heading, color: palette.keyword, fontWeight: "600" },
    { tag: t.link, color: palette.name, textDecoration: "underline" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strong, fontWeight: "600" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.invalid, color: palette.invalid }
  ]);
}

const cache = new Map<ResolvedThemeId, Extension>();

export function editorTheme(theme: ResolvedThemeId): Extension {
  const cached = cache.get(theme);
  if (cached) return cached;

  const palette = PALETTES[theme];
  const extension: Extension = [
    baseTheme,
    syntaxHighlighting(highlightStyle(palette), { fallback: true })
  ];
  cache.set(theme, extension);
  return extension;
}

export const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: "system", label: "System" },
  { id: "paper", label: "Paper — light" },
  { id: "sepia", label: "Sepia — warm light" },
  { id: "ink", label: "Ink — dark" },
  { id: "slate", label: "Slate — cool dark" }
];
