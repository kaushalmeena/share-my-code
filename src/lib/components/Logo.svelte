<script lang="ts">
  import CodeXml from "@lucide/svelte/icons/code-xml";

  /**
   * The wordmark's icon, and the shape the favicon in `static/icon.svg` is cut
   * from — same Lucide glyph, so the tab and the header never drift apart.
   *
   * The blue is fixed rather than themed: it is the one brand colour in an
   * otherwise monochrome UI, and at mid luminance it holds contrast against
   * every theme background, light or dark.
   */
  type Props = { size?: number; title?: string };
  const { size = 20, title }: Props = $props();
</script>

<CodeXml
  {size}
  color="var(--color-brand)"
  strokeWidth={2.25}
  class="shrink-0"
  aria-label={title}
  aria-hidden={title ? undefined : "true"}
/>
