<script lang="ts">
  import { fade } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import GithubLink from "$components/GithubLink.svelte";
  import Logo from "$components/Logo.svelte";
  import { ROOM_ID_PATTERN, hostTokenStorageKey } from "$lib/config";

  let creating = $state(false);
  let joinId = $state("");
  let error = $state<string | null>(null);

  const normalisedJoinId = $derived(joinId.trim().toLowerCase());
  const canJoin = $derived(ROOM_ID_PATTERN.test(normalisedJoinId));

  async function createRoom() {
    if (creating) return;
    creating = true;
    error = null;

    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const { roomId, hostToken } = (await response.json()) as {
        roomId: string;
        hostToken: string;
      };

      // Holding this token is what makes this browser the host. It never
      // leaves the device except as a query parameter on the relay socket.
      try {
        localStorage.setItem(hostTokenStorageKey(roomId), hostToken);
      } catch {
        // Without storage you simply join as a guest in your own room.
      }

      await goto(resolve("/r/[room]", { room: roomId }));
    } catch (cause) {
      console.error(cause);
      error = "Could not create a pad. Check your connection and try again.";
      creating = false;
    }
  }

  function join(event: SubmitEvent) {
    event.preventDefault();
    if (canJoin) {
      void goto(resolve("/r/[room]", { room: normalisedJoinId }));
    }
  }
</script>

<main class="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6">
  <h1 class="flex items-center gap-2.5 text-2xl font-medium tracking-tight">
    <Logo size={26} />
    <span>ShareMyCode</span>
  </h1>
  <p class="mt-2 text-sm text-muted">
    A collaborative code pad. Create one, share the link, edit together in
    realtime. No account, nothing to install.
  </p>

  <div class="mt-8 space-y-6">
    <button
      type="button"
      class="control control-primary w-full py-3"
      disabled={creating}
      onclick={createRoom}
    >
      {creating ? "Creating…" : "Create a pad"}
    </button>

    <div class="flex items-center gap-3 text-xs text-muted">
      <span class="h-px flex-1" style:background="var(--color-line)"></span>
      <span>or join one</span>
      <span class="h-px flex-1" style:background="var(--color-line)"></span>
    </div>

    <form class="flex gap-2" onsubmit={join}>
      <label class="sr-only" for="room-id">Room id</label>
      <input
        id="room-id"
        class="field font-mono"
        type="text"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        placeholder="abcd-efgh-jkmn"
        bind:value={joinId}
      />
      <button type="submit" class="control" disabled={!canJoin}>Join</button>
    </form>

    {#if error}
      <p
        class="text-sm text-danger"
        role="alert"
        transition:fade={{ duration: 160 }}
      >
        {error}
      </p>
    {/if}
  </div>

  <ul class="mt-12 space-y-2 text-xs text-muted">
    <li>
      Edits merge without conflicts, so two people can type in the same line.
    </li>
    <li>
      Reloading never loses work — your pad is cached locally and on the server.
    </li>
    <li>As the creator, you can make a pad read-only for everyone else.</li>
  </ul>

  <div
    class="mt-8 flex items-center justify-center gap-3 border-t pt-4 text-xs
      text-muted"
    style:border-color="var(--color-line)"
  >
    <GithubLink size={14} label />
    <span>Open source, MIT licensed.</span>
  </div>
</main>
