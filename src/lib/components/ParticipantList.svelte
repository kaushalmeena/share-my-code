<script lang="ts">
  import type { Participant } from "$lib/types";

  /**
   * Presence as a colour key plus a plain-language count.
   *
   * Initials were the first attempt and told you nothing — two-letter codes
   * from generated names are noise, and they collide constantly. What people
   * actually need from the header is "how many of us are here", and a way to
   * match a caret colour in the editor to a person. So: one swatch per
   * participant in their cursor colour, and the count spelled out.
   */
  type Props = {
    participants: Participant[];
    /** Show at most this many swatches before collapsing into a +N counter. */
    limit?: number;
  };

  const { participants, limit = 5 }: Props = $props();

  const others = $derived(participants.filter((person) => !person.isSelf));
  const visible = $derived(participants.slice(0, limit));
  const overflow = $derived(Math.max(0, participants.length - limit));

  const summary = $derived.by(() => {
    if (others.length === 0) return "Only you";
    if (others.length === 1) return `You + ${others[0]?.name}`;
    return `You + ${others.length} others`;
  });

  const fullList = $derived(
    participants
      .map((person) => (person.isSelf ? `${person.name} (you)` : person.name))
      .join("\n")
  );
</script>

<div class="flex items-center gap-2" title={fullList}>
  <div class="flex items-center gap-1" aria-hidden="true">
    {#each visible as participant (participant.id)}
      <span
        class="size-2.5 shrink-0"
        style:background={participant.color}
        style:outline={participant.isSelf
          ? "1px solid var(--color-muted)"
          : "none"}
        style:outline-offset="1px"
      ></span>
    {/each}
    {#if overflow > 0}
      <span class="text-[10px] text-muted">+{overflow}</span>
    {/if}
  </div>

  <span class="max-w-40 truncate text-xs text-muted">
    {summary}
  </span>
</div>
