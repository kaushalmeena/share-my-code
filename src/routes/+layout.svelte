<script lang="ts">
  import type { Snippet } from "svelte";
  import "../app.css";
  // Instantiating the store here wires up theme + persistence for every route.
  import "$lib/stores/preferences.svelte";

  const { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>ShareMyCode</title>
  <meta
    name="description"
    content="Realtime collaborative code pad. Create a room, share the link, edit together."
  />
</svelte:head>

<div class="flex h-dvh flex-col">
  {@render children()}
</div>
