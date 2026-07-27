<script lang="ts">
  /**
   * Link to the source repository — the one place the URL lives.
   *
   * The mark is inlined rather than imported: Lucide carries no brand icons, and
   * GitHub's guidelines allow the Invertocat specifically for linking to GitHub.
   * `fill="currentColor"` on a real element means it inherits the theme, unlike
   * the data-URI trap the select chevron used to fall into.
   *
   * The href is a literal, not a constant: `svelte/no-navigation-without-resolve`
   * cannot tell a dynamic href is external, so it would flag it as an
   * unresolved internal route.
   */
  type Props = { size?: number; label?: boolean };
  const { size = 15, label = false }: Props = $props();
</script>

<a
  href="https://github.com/kaushalmeena/share-my-code"
  target="_blank"
  rel="noopener noreferrer"
  class="inline-flex shrink-0 items-center gap-1.5 transition-opacity
    hover:opacity-70"
  style:transition-duration="var(--duration-fast)"
  aria-label="View the source on GitHub"
  title="View the source on GitHub"
>
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
        -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
        .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
        -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
        1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
        1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0
        1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0016 8c0-4.42-3.58
        -8-8-8z"
    />
  </svg>
  {#if label}<span>GitHub</span>{/if}
</a>
