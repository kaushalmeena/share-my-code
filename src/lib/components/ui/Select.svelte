<script lang="ts" generics="T extends string">
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
  <select
    class="field appearance-none pr-8 enabled:cursor-pointer"
    style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 6%22><path d=%22M0 0l5 6 5-6z%22 fill=%22currentColor%22/></svg>'); background-repeat: no-repeat; background-position: right 10px center; background-size: 9px;"
    {value}
    {disabled}
    onchange={(event) => onChange(event.currentTarget.value as T)}
  >
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
