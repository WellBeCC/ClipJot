<script setup lang="ts">
defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  "update:modelValue": [size: number]
}>()

interface SizeOption {
  value: number
  label: string
}

const SIZE_OPTIONS: readonly SizeOption[] = [
  { value: 12, label: "S" },
  { value: 16, label: "M" },
  { value: 24, label: "L" },
  { value: 36, label: "XL" },
] as const

function select(value: number): void {
  emit("update:modelValue", value)
}
</script>

<template>
  <div
    class="font-size-selector"
    role="radiogroup"
    aria-label="Font size"
  >
    <button
      v-for="option in SIZE_OPTIONS"
      :key="option.value"
      class="font-size-selector__option"
      :class="{ 'font-size-selector__option--active': modelValue === option.value }"
      :aria-label="`${option.label} (${option.value}px)`"
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
.font-size-selector {
  display: flex;
  align-items: center;
  gap: 2px;
}

.font-size-selector__option {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.1s ease, background-color 0.1s ease, color 0.1s ease;
}

.font-size-selector__option:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.font-size-selector__option--active {
  background: var(--surface-panel);
  border-color: var(--interactive-default);
  color: var(--text-primary);
}
</style>
