<script lang="ts">
  import type { ConnectionStatus } from "$lib/types";

  type Props = { status: ConnectionStatus; synced: boolean };
  const { status, synced }: Props = $props();

  /**
   * "Live" was the first label and it answered the wrong question — it said
   * the socket was up, when what someone actually wants to know is whether
   * their work is safe. These labels say that instead, and none of the states
   * is alarming: an unsent edit is still saved locally and merges on
   * reconnect, so nothing here should read as data loss.
   */
  const state = $derived.by(() => {
    if (status === "offline") {
      return {
        label: "Offline",
        detail:
          "Editing offline. Your changes are saved here and will sync when you reconnect.",
        tone: "warn" as const
      };
    }
    if (status === "reconnecting") {
      return {
        label: "Reconnecting",
        detail:
          "Lost the connection. Your changes are saved here and will sync automatically.",
        tone: "busy" as const
      };
    }
    if (status === "connecting" || !synced) {
      return {
        label: "Syncing",
        detail: "Fetching the latest version of this pad.",
        tone: "busy" as const
      };
    }
    return {
      label: "Synced",
      detail: "Everything is saved and shared with the room.",
      tone: "ok" as const
    };
  });

  const dotColor = $derived(
    state.tone === "ok"
      ? "var(--color-brand)"
      : state.tone === "warn"
        ? "var(--color-danger)"
        : "var(--color-muted)"
  );
</script>

<span
  class="text-muted inline-flex items-center gap-1.5 text-xs whitespace-nowrap"
  title={state.detail}
>
  <span
    class={[
      "inline-block h-2 w-2 shrink-0 transition-colors",
      state.tone === "busy" && "animate-pulse"
    ]}
    style:background={dotColor}
    style:transition-duration="var(--duration-base)"
    aria-hidden="true"
  ></span>
  <span>{state.label}</span>
</span>
