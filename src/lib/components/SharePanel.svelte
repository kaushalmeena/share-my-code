<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Copy from "@lucide/svelte/icons/copy";
  import Panel from "$components/ui/Panel.svelte";
  import type { RoomSession } from "$collab/session.svelte";

  type Props = { session: RoomSession; open: boolean; onClose: () => void };
  const { session, open, onClose }: Props = $props();

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const url = $derived(open ? window.location.href : "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access can be denied; the input is selectable as a fallback.
      return;
    }
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = false), 2000);
  }

  $effect(() => () => clearTimeout(copyTimer));
</script>

<Panel {open} title="Share" {onClose}>
  <div class="space-y-8">
    <section>
      <span class="label">Room link</span>
      <div class="flex gap-2">
        <input
          class="field font-mono text-xs"
          type="text"
          readonly
          value={url}
          onfocus={(event) => event.currentTarget.select()}
        />
        <!-- Focus lands here rather than on the field: copying is what people
             came for, and focusing the input scrolls it to the tail of the URL. -->
        <button
          type="button"
          class="control control-primary shrink-0"
          data-autofocus
          onclick={copy}
        >
          {#if copied}
            <Check size={14} />
            Copied
          {:else}
            <Copy size={14} />
            Copy
          {/if}
        </button>
      </div>
      <p class="mt-2 text-xs text-muted">
        Anyone with this link can open the pad. No account needed.
      </p>
    </section>

    <section>
      <span class="label">In this room — {session.participants.length}</span>
      <ul class="space-y-2">
        {#each session.participants as participant (participant.id)}
          <li class="flex items-center gap-2 text-sm">
            <span
              class="inline-block size-3 shrink-0"
              style:background={participant.color}
              aria-hidden="true"
            ></span>
            <span class="truncate">{participant.name}</span>
            {#if participant.isSelf}
              <span class="text-xs text-muted">(you)</span>
            {/if}
          </li>
        {:else}
          <li class="text-sm text-muted">Just you so far.</li>
        {/each}
      </ul>
    </section>

    <section>
      <span class="label">Access</span>
      <p class="text-sm">
        {#if session.isHost}
          You are the host of this pad.
          {session.settings.guestsCanEdit
            ? " Guests can edit."
            : " Guests can read only."}
        {:else if session.settings.guestsCanEdit}
          You can edit this pad.
        {:else}
          The host has made this pad read-only.
        {/if}
      </p>
    </section>
  </div>
</Panel>
