<script setup lang="ts">
import type { AspectRatioPreset } from "../types/tools"

defineProps<{
  modelValue: AspectRatioPreset
}>()

const emit = defineEmits<{
  "update:modelValue": [preset: AspectRatioPreset]
}>()

interface RatioOption {
  value: AspectRatioPreset
  label: string
}

const RATIO_OPTIONS: readonly RatioOption[] = [
  { value: "free", label: "Free" },
  { value: "original", label: "Original" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
] as const

function select(value: AspectRatioPreset): void {
  emit("update:modelValue", value)
}
</script>

<template>
  <div
    class="aspect-ratio-selector"
    role="radiogroup"
    aria-label="Aspect ratio"
  >
    <button
      v-for="option in RATIO_OPTIONS"
      :key="option.value"
      class="aspect-ratio-selector__option"
      :class="{ 'aspect-ratio-selector__option--active': modelValue === option.value }"
      :aria-label="option.label"
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
.aspect-ratio-selector {
  display: flex;
  align-items: center;
  gap: 2px;
}

.aspect-ratio-selector__option {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.1s ease, background-color 0.1s ease, color 0.1s ease;
}

.aspect-ratio-selector__option:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.aspect-ratio-selector__option--active {
  background: var(--surface-panel);
  border-color: var(--interactive-default);
  color: var(--text-primary);
}
</style>
