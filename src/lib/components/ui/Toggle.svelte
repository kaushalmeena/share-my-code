<script lang="ts">
  /**
   * A square checkbox rather than a sliding switch.
   *
   * A pill-shaped switch with a travelling knob is the one shape that cannot
   * be squared off without looking broken, so it sat badly in a zero-radius
   * UI. A checkbox carries the same on/off meaning, reads instantly, and is a
   * real `<input>` — so keyboard, focus and screen-reader behaviour come free.
   */
  type Props = {
    checked: boolean;
    label: string;
    /** Optional supporting line. Prefer `title` for anything that is only
     *  worth reading once — a permanent second line of text under every
     *  toggle makes a settings panel harder to scan, not easier. */
    description?: string;
    /** Hover/assistive text explaining the control, including why it is
     *  disabled. */
    title?: string;
    disabled?: boolean;
    /** camelCase keeps this component callback distinct from the DOM's
     *  lowercase `onchange`, which stays reserved for the real `<input>`. */
    onChange: (checked: boolean) => void;
  };

  const {
    checked,
    label,
    description,
    title,
    disabled = false,
    onChange
  }: Props = $props();
</script>

<label
  class="group flex cursor-pointer items-start gap-3
    has-disabled:cursor-not-allowed"
  {title}
>
  <span class="relative mt-px flex size-4.5 shrink-0 items-center">
    <input
      type="checkbox"
      class="peer size-4.5 cursor-pointer appearance-none border
        transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style:border-color={checked ? "var(--color-ink)" : "var(--color-line)"}
      style:background={checked ? "var(--color-ink)" : "transparent"}
      style:transition-duration="var(--duration-fast)"
      {checked}
      {disabled}
      onchange={(event) => onChange(event.currentTarget.checked)}
    />
    {#if checked}
      <svg
        class="pointer-events-none absolute left-0.75 size-3"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 6.5 L4.8 9 L10 3"
          stroke="var(--color-canvas)"
          stroke-width="1.8"
          stroke-linecap="square"
        />
      </svg>
    {/if}
  </span>

  <span class="min-w-0 select-none">
    <!-- One class expression rather than `class=` plus a `class:` directive,
         so the conditional class stays part of the linted class list. -->
    <span class={["block text-sm/4.5", disabled && "text-muted"]}>
      {label}
    </span>
    {#if description}
      <span class="mt-1 block text-xs/snug text-muted">
        {description}
      </span>
    {/if}
  </span>
</label>
