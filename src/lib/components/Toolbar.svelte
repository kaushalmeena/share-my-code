<script lang="ts">
  import { resolve } from "$app/paths";
  import Settings from "@lucide/svelte/icons/settings";
  import Share2 from "@lucide/svelte/icons/share-2";
  import ConnectionStatus from "$components/ConnectionStatus.svelte";
  import Logo from "$components/Logo.svelte";
  import ParticipantList from "$components/ParticipantList.svelte";
  import type { RoomSession } from "$collab/session.svelte";
  import { findLanguage } from "$editor/languages";

  type Props = {
    session: RoomSession;
    onShare: () => void;
    onSettings: () => void;
  };

  const { session, onShare, onSettings }: Props = $props();

  const language = $derived(findLanguage(session.settings.language).label);
</script>

<header
  class="flex h-12 shrink-0 items-center gap-3 border-b px-3"
  style:border-color="var(--color-line)"
>
  <a
    href={resolve("/")}
    class="flex items-center gap-2 text-sm font-medium tracking-tight
      whitespace-nowrap transition-opacity hover:opacity-70"
    style:transition-duration="var(--duration-fast)"
  >
    <Logo />
    <span class="hidden sm:inline"> ShareMyCode </span>
  </a>

  <span class="h-4 w-px shrink-0" style:background="var(--color-line)"></span>

  <div class="flex min-w-0 flex-1 items-center gap-2">
    <span class="truncate text-sm">
      {session.settings.title || "Untitled pad"}
    </span>
    <span class="text-muted hidden shrink-0 text-xs md:inline">
      {language}
    </span>
    {#if !session.canEdit}
      <span
        class="flex h-5 shrink-0 items-center border px-1.5 text-[10px]
          leading-none tracking-wide uppercase"
        style:border-color="var(--color-line)"
        title="The host has made this pad read-only"
      >
        Read only
      </span>
    {/if}
  </div>

  <div class="hidden h-8 items-center md:flex">
    <ParticipantList participants={session.participants} />
  </div>

  <div class="hidden h-8 items-center sm:flex">
    <ConnectionStatus status={session.status} synced={session.synced} />
  </div>

  <!-- Every header control is pinned to the same 32px box so the row reads as
       one baseline; without it each button sizes to its own content. -->
  <button type="button" class="control h-8 shrink-0" onclick={onShare}>
    <Share2 size={14} />
    <span class="hidden sm:inline">Share</span>
  </button>

  <button
    type="button"
    class="control h-8 w-8 shrink-0 px-0!"
    aria-label="Settings"
    onclick={onSettings}
  >
    <Settings size={15} />
  </button>
</header>
