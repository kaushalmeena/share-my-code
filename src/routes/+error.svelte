<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import RotateCw from "@lucide/svelte/icons/rotate-cw";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import Logo from "$components/Logo.svelte";

  /**
   * A bare status code tells someone nothing about what to do next, and
   * SvelteKit's default messages ("Internal Error", "Not Found") are worse
   * than silence. These say what happened in plain terms and offer the action
   * that actually helps for that class of failure.
   */
  const explanation = $derived.by(() => {
    const { status, error } = page;

    if (status === 404) {
      return {
        heading: "No pad here",
        body: "This link does not point to a pad. It may have been mistyped, or the pad may have expired — pads are removed after two weeks without activity.",
        retry: false
      };
    }
    if (status === 403) {
      return {
        heading: "Not your pad",
        body: "You do not have access to this pad.",
        retry: false
      };
    }
    if (status >= 500) {
      return {
        heading: "Something broke on our end",
        body: "The server could not load this page. Your pads are stored separately and are not affected — try again in a moment.",
        retry: true
      };
    }
    return {
      heading: "That did not work",
      body: error?.message ?? "Something unexpected happened.",
      retry: true
    };
  });
</script>

<svelte:head>
  <title>{page.status} · ShareMyCode</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6">
  <a
    href={resolve("/")}
    class="mb-10 flex items-center gap-2.5 text-sm font-medium tracking-tight
      transition-opacity hover:opacity-70"
    style:transition-duration="var(--duration-fast)"
  >
    <Logo />
    <span>ShareMyCode</span>
  </a>

  <p class="text-muted font-mono text-xs tracking-widest uppercase">
    Error {page.status}
  </p>
  <h1 class="mt-2 text-2xl font-medium tracking-tight">
    {explanation.heading}
  </h1>
  <p class="text-muted mt-3 text-sm leading-relaxed">
    {explanation.body}
  </p>

  <div class="mt-8 flex flex-wrap gap-2">
    <a href={resolve("/")} class="control control-primary">
      <ArrowLeft size={14} />
      Back to start
    </a>
    {#if explanation.retry}
      <button type="button" class="control" onclick={() => location.reload()}>
        <RotateCw size={14} />
        Try again
      </button>
    {/if}
  </div>
</main>
