<script setup lang="ts">
defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  "update:modelValue": [radius: number]
}>()

interface SizeOption {
  value: number
  label: string
}

const SIZE_OPTIONS: readonly SizeOption[] = [
  { value: 10, label: "S" },
  { value: 14, label: "M" },
  { value: 20, label: "L" },
] as const

function select(value: number): void {
  emit("update:modelValue", value)
}
</script>

<template>
  <div
    class="callout-size-selector"
    role="radiogroup"
    aria-label="Callout size"
  >
    <button
      v-for="option in SIZE_OPTIONS"
      :key="option.value"
      class="callout-size-selector__option"
      :class="{ 'callout-size-selector__option--active': modelValue === option.value }"
      :aria-label="`Size ${option.label}`"
      :aria-checked="modelValue === option.value"
      role="radio"
      type="button"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.callout-size-selector {
  display: flex;
  align-items: center;
  gap: 2px;
}

.callout-size-selector__option {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.1s ease, background-color 0.1s ease, color 0.1s ease;
}

.callout-size-selector__option:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.callout-size-selector__option--active {
  background: var(--surface-panel);
  border-color: var(--interactive-default);
  color: var(--text-primary);
}
</style>
