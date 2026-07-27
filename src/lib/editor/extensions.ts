import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap
} from "@codemirror/autocomplete";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection
} from "@codemirror/view";
import { yUndoManagerKeymap } from "y-codemirror.next";

/**
 * Compartments for everything that can change without rebuilding the editor.
 * Each one is reconfigured in place when the corresponding setting moves.
 */
export const compartments = {
  language: new Compartment(),
  theme: new Compartment(),
  readOnly: new Compartment(),
  lineNumbers: new Compartment(),
  wrap: new Compartment(),
  fontSize: new Compartment()
};

/**
 * The always-on extension set.
 *
 * Note the absence of `@codemirror/commands`' `history()`: undo has to run
 * through the Yjs `UndoManager` supplied by `yCollab`, otherwise undo would
 * happily revert someone else's typing.
 */
export const baseExtensions: Extension[] = [
  highlightSpecialChars(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  indentUnit.of("  "),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  highlightSelectionMatches(),
  foldGutter({
    markerDOM: (open) => {
      const marker = document.createElement("span");
      marker.textContent = open ? "−" : "+";
      marker.style.cssText = "cursor:pointer;color:var(--color-muted)";
      return marker;
    }
  }),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...yUndoManagerKeymap,
    indentWithTab
  ])
];

export const fontSizeTheme = (size: number): Extension =>
  EditorView.theme({
    "&": { fontSize: `${size}px` },
    ".cm-gutters": { fontSize: `${size - 1}px` }
  });

export const lineNumbersExtension = (enabled: boolean): Extension =>
  enabled ? lineNumbers() : [];

export const wrapExtension = (enabled: boolean): Extension =>
  enabled ? EditorView.lineWrapping : [];

export const readOnlyExtension = (readOnly: boolean): Extension =>
  readOnly
    ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
    : [];
