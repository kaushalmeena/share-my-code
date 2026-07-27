<script lang="ts">
  import Panel from "$components/ui/Panel.svelte";
  import Select from "$components/ui/Select.svelte";
  import Toggle from "$components/ui/Toggle.svelte";
  import type { RoomSession } from "$collab/session.svelte";
  import { LANGUAGES } from "$editor/languages";
  import { THEME_OPTIONS } from "$editor/themes";
  import {
    MAX_FONT_SIZE,
    MIN_FONT_SIZE,
    preferences
  } from "$lib/stores/preferences.svelte";
  import { PARTICIPANT_COLORS } from "$lib/utils/identity";
  import type { ThemeId } from "$lib/types";

  type Props = { session: RoomSession; open: boolean; onClose: () => void };
  const { session, open, onClose }: Props = $props();

  const languageOptions = LANGUAGES.map((language) => ({
    value: language.id,
    label: language.label
  }));

  const themeOptions = THEME_OPTIONS.map((theme) => ({
    value: theme.id as ThemeId,
    label: theme.label
  }));

  const prefs = $derived(preferences.value);

  function rename(name: string) {
    const trimmed = name.slice(0, 32);
    preferences.update({ name: trimmed });
    session.setPresence({ name: trimmed || "Anonymous", color: session.color });
  }

  /** Picking a colour pins it, so joining another room will not reassign it. */
  function recolor(color: string) {
    preferences.update({ color, colorPinned: true });
    session.setPresence({ name: prefs.name, color }, true);
  }
</script>

<Panel {open} title="Settings" {onClose}>
  <div class="space-y-8">
    <!-- Room-wide: everyone sees these change. -->
    <section class="space-y-4">
      <h3 class="text-muted text-xs tracking-wide uppercase">Room</h3>

      <Select
        label="Language"
        value={session.settings.language}
        options={languageOptions}
        onChange={(value) => session.setLanguage(value)}
      />

      <div>
        <label class="label" for="room-title">Title</label>
        <input
          id="room-title"
          class="field"
          type="text"
          maxlength="60"
          placeholder="Untitled pad"
          value={session.settings.title}
          oninput={(event) => session.setTitle(event.currentTarget.value)}
        />
      </div>

      <!-- Guests see this disabled. The `title` carries the reason without
           putting a line of explanatory text under every host control. -->
      <Toggle
        label="Guests can edit"
        title={session.isHost
          ? "Turn off to make this pad read-only for everyone but you."
          : "Only the room's host can change this."}
        checked={session.settings.guestsCanEdit}
        disabled={!session.isHost}
        onChange={(checked) => session.setGuestsCanEdit(checked)}
      />
    </section>

    <!-- Local: nobody else is affected. -->
    <section class="space-y-4">
      <h3 class="text-muted text-xs tracking-wide uppercase">You</h3>

      <div>
        <label class="label" for="display-name">Display name</label>
        <input
          id="display-name"
          class="field"
          type="text"
          maxlength="32"
          data-autofocus
          value={prefs.name}
          oninput={(event) => rename(event.currentTarget.value)}
        />
      </div>

      <div>
        <span class="label">Cursor colour</span>
        <div class="flex flex-wrap gap-1.5">
          {#each PARTICIPANT_COLORS as color (color)}
            <button
              type="button"
              class="h-7 w-7 border-2"
              style:background={color}
              style:border-color={session.color === color
                ? "var(--color-ink)"
                : "transparent"}
              aria-label="Use colour {color}"
              aria-pressed={session.color === color}
              onclick={() => recolor(color)}
            ></button>
          {/each}
        </div>
      </div>
    </section>

    <section class="space-y-4">
      <h3 class="text-muted text-xs tracking-wide uppercase">Editor</h3>

      <Select
        label="Theme"
        value={prefs.theme}
        options={themeOptions}
        onChange={(value) => preferences.setTheme(value)}
      />

      <div>
        <label class="label" for="font-size">
          Font size — {prefs.fontSize}px
        </label>
        <input
          id="font-size"
          class="accent-ink w-full"
          type="range"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          value={prefs.fontSize}
          oninput={(event) =>
            preferences.setFontSize(Number(event.currentTarget.value))}
        />
      </div>

      <Toggle
        label="Line numbers"
        checked={prefs.lineNumbers}
        onChange={(checked) => preferences.update({ lineNumbers: checked })}
      />

      <Toggle
        label="Line wrapping"
        checked={prefs.wrapLines}
        onChange={(checked) => preferences.update({ wrapLines: checked })}
      />
    </section>
  </div>
</Panel>
