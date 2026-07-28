<script lang="ts">
  import { EditorState } from "@codemirror/state";
  import { EditorView } from "@codemirror/view";
  import { yCollab } from "y-codemirror.next";
  import type { RoomSession } from "$collab/session.svelte";
  import {
    baseExtensions,
    compartments,
    fontSizeTheme,
    lineNumbersExtension,
    readOnlyExtension,
    wrapExtension
  } from "$editor/extensions";
  import { findLanguage } from "$editor/languages";
  import { editorTheme } from "$editor/themes";
  import { preferences } from "$lib/stores/preferences.svelte";

  type Props = { session: RoomSession };
  const { session }: Props = $props();

  let host = $state<HTMLDivElement>();
  let view: EditorView | null = null;

  /** Guards against a slow grammar import landing after a later switch. */
  let languageRequest = 0;

  $effect(() => {
    if (!host) return;

    const prefs = preferences.value;
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: session.text.toString(),
        extensions: [
          ...baseExtensions,
          // yCollab replaces the document with the Y.Text content and keeps
          // the two in sync from here on, including remote cursors.
          yCollab(session.text, session.awareness),
          compartments.language.of([]),
          compartments.theme.of(editorTheme(preferences.resolvedTheme)),
          compartments.readOnly.of(readOnlyExtension(!session.canEdit)),
          compartments.lineNumbers.of(lineNumbersExtension(prefs.lineNumbers)),
          compartments.wrap.of(wrapExtension(prefs.wrapLines)),
          compartments.fontSize.of(fontSizeTheme(prefs.fontSize))
        ]
      })
    });

    return () => {
      view?.destroy();
      view = null;
    };
  });

  // Each of these reads exactly one setting, so a font-size change does not
  // trigger a grammar reload and vice versa.

  $effect(() => {
    const languageId = session.settings.language;
    if (!view) return;
    const request = ++languageRequest;

    void findLanguage(languageId)
      .load()
      .then((support) => {
        if (!view || request !== languageRequest) return;
        view.dispatch({
          effects: compartments.language.reconfigure(support)
        });
      })
      .catch((error) => {
        console.error(`Failed to load grammar for "${languageId}"`, error);
      });
  });

  $effect(() => {
    const theme = preferences.resolvedTheme;
    view?.dispatch({
      effects: compartments.theme.reconfigure(editorTheme(theme))
    });
  });

  $effect(() => {
    const canEdit = session.canEdit;
    view?.dispatch({
      effects: compartments.readOnly.reconfigure(readOnlyExtension(!canEdit))
    });
  });

  $effect(() => {
    const enabled = preferences.value.lineNumbers;
    view?.dispatch({
      effects: compartments.lineNumbers.reconfigure(
        lineNumbersExtension(enabled)
      )
    });
  });

  $effect(() => {
    const enabled = preferences.value.wrapLines;
    view?.dispatch({
      effects: compartments.wrap.reconfigure(wrapExtension(enabled))
    });
  });

  $effect(() => {
    const size = preferences.value.fontSize;
    view?.dispatch({
      effects: compartments.fontSize.reconfigure(fontSizeTheme(size))
    });
  });

  export function focus() {
    view?.focus();
  }
</script>

<div class="size-full overflow-hidden" bind:this={host}></div>
