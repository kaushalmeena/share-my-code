<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { prefersReducedMotion } from "svelte/motion";
  import type { Snippet } from "svelte";

  type Props = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: Snippet;
  };

  const { open, title, onClose, children }: Props = $props();

  let panel = $state<HTMLElement>();

  // Svelte transitions take numbers, so motion preferences are honoured here
  // rather than by the global CSS rule.
  const duration = $derived(prefersReducedMotion.current ? 0 : 240);

  /** Move focus into the panel when it opens, and restore it on close. */
  $effect(() => {
    if (!open || !panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const target = panel.querySelector<HTMLElement>("[data-autofocus]");
    (target ?? panel).focus();
    return () => previous?.focus();
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
  <!-- Scrim. Clicking it dismisses, matching the Escape affordance. -->
  <div
    class="fixed inset-0 z-40 bg-black/30"
    role="presentation"
    onclick={onClose}
    transition:fade={{ duration }}
  ></div>

  <div
    bind:this={panel}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    class="fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col
      border-l outline-none"
    style:background="var(--color-canvas)"
    style:border-color="var(--color-line)"
    transition:fly={{ x: 24, duration, easing: cubicOut, opacity: 0 }}
  >
    <header
      class="flex shrink-0 items-center justify-between border-b px-4 py-3"
      style:border-color="var(--color-line)"
    >
      <h2 class="text-sm tracking-wide uppercase">{title}</h2>
      <button
        type="button"
        class="control h-7 w-7 px-0!"
        aria-label="Close {title}"
        onclick={onClose}
      >
        <X size={15} />
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-4">
      {@render children()}
    </div>
  </div>
{/if}
