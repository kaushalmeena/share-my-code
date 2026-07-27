<script lang="ts" generics="T extends string">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";

  type Option = { value: T; label: string };
  type Props = {
    value: T;
    options: Option[];
    label?: string;
    disabled?: boolean;
    /** Hover/assistive text, e.g. why the control is disabled. */
    title?: string;
    /** camelCase keeps this component callback distinct from the DOM's
     *  lowercase `onchange`, which stays reserved for the real `<select>`. */
    onChange: (value: T) => void;
  };

  let {
    value,
    options,
    label,
    disabled = false,
    title,
    onChange
  }: Props = $props();
</script>

<label class="block" {title}>
  {#if label}<span class="label">{label}</span>{/if}

  <!--
    The chevron is a real element, not a `background-image` data URI. A data URI
    is its own document, so `currentColor` inside one resolves to black rather
    than inheriting this element's colour — it stayed black in every theme and
    ignored the disabled state. As an element it inherits both for free.
  -->
  <span class="relative block">
    <select
      class="field appearance-none pr-9 enabled:cursor-pointer"
      {value}
      {disabled}
      onchange={(event) => onChange(event.currentTarget.value as T)}
    >
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <ChevronDown
      size={15}
      class={[
        "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2",
        disabled ? "text-muted" : "text-ink"
      ]}
    />
  </span>
</label>
