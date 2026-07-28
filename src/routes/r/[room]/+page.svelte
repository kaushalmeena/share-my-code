<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import CodeEditor from "$components/CodeEditor.svelte";
  import ConnectionStatus from "$components/ConnectionStatus.svelte";
  import GithubLink from "$components/GithubLink.svelte";
  import SettingsPanel from "$components/SettingsPanel.svelte";
  import SharePanel from "$components/SharePanel.svelte";
  import Toolbar from "$components/Toolbar.svelte";
  import { RoomSession } from "$collab/session.svelte";
  import { preferences } from "$lib/stores/preferences.svelte";
  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();

  let session = $state<RoomSession | null>(null);
  let sharePanelOpen = $state(false);
  let settingsPanelOpen = $state(false);

  // The session touches IndexedDB, WebSockets and `window`, so it is created
  // after mount rather than during SSR.
  onMount(() => {
    const { name, color, seed, colorPinned } = preferences.value;
    const created = new RoomSession(
      data.roomId,
      { name, color },
      { seed, colorPinned }
    );
    session = created;

    return () => {
      created.destroy();
      session = null;
    };
  });

  // The room may hand us a different colour than we asked for, to keep every
  // cursor distinguishable. Remember it so we open with it next time.
  $effect(() => {
    const claimed = session?.color;
    if (claimed && claimed !== preferences.value.color) {
      preferences.update({ color: claimed });
    }
  });

  // Offer the share panel automatically the first time a host lands in an
  // empty pad — sharing the link is the whole point of creating one.
  let sharePrompted = false;
  $effect(() => {
    if (!session?.isHost || sharePrompted || !session.synced) return;
    if (session.participants.length <= 1 && session.text.length === 0) {
      sharePrompted = true;
      sharePanelOpen = true;
    }
  });
</script>

<svelte:head>
  <title>{session?.settings.title || data.roomId} · ShareMyCode</title>
  <!-- A pad's contents are private to whoever has the link. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if session}
  <Toolbar
    {session}
    onShare={() => (sharePanelOpen = true)}
    onSettings={() => (settingsPanelOpen = true)}
  />

  {#if session.diverged}
    <!-- Only reachable if the host locked the pad mid-keystroke. The local
         copy now holds a change the room will never accept, and Yjs blocks
         everything behind it, so discarding that copy is the only way back. -->
    <div
      class="flex shrink-0 flex-wrap items-center gap-3 border-b px-3 py-2 text-xs"
      style:border-color="var(--color-line)"
      style:background="var(--color-surface)"
      role="alert"
      transition:slide={{ duration: 180 }}
    >
      <span class="flex-1">
        This pad became read-only while you were typing, so your last change was
        not accepted. Reload to pick up the room's current version.
      </span>
      <button
        type="button"
        class="control"
        onclick={() => void session?.resetLocalState()}
      >
        Reload pad
      </button>
    </div>
  {/if}

  <main class="relative min-h-0 flex-1">
    {#if session.ready}
      <div class="h-full" in:fade={{ duration: 160 }}>
        <CodeEditor {session} />
      </div>
    {:else}
      <div class="flex h-full items-center justify-center text-sm text-muted">
        Opening pad…
      </div>
    {/if}
  </main>

  <footer
    class="flex h-8 shrink-0 items-center justify-between border-t px-3
      text-xs text-muted"
    style:border-color="var(--color-line)"
  >
    <span class="font-mono">{data.roomId}</span>
    <span class="sm:hidden">
      <ConnectionStatus status={session.status} synced={session.synced} />
    </span>
    <span class="flex items-center gap-3">
      <span class="hidden sm:inline">
        {session.participants.length}
        {session.participants.length === 1 ? "person" : "people"} here
      </span>
      <GithubLink size={14} />
    </span>
  </footer>

  <SharePanel
    {session}
    open={sharePanelOpen}
    onClose={() => (sharePanelOpen = false)}
  />
  <SettingsPanel
    {session}
    open={settingsPanelOpen}
    onClose={() => (settingsPanelOpen = false)}
  />
{:else}
  <div class="flex flex-1 items-center justify-center text-sm text-muted">
    Opening pad…
  </div>
{/if}
