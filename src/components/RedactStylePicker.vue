<script setup lang="ts">
import type { RedactStyle } from "../types/tools"

defineProps<{
  modelValue: RedactStyle
}>()

const emit = defineEmits<{
  "update:modelValue": [style: RedactStyle]
}>()

interface StyleOption {
  value: RedactStyle
  label: string
}

const STYLE_OPTIONS: readonly StyleOption[] = [
  { value: "solid", label: "Solid" },
  { value: "pixelate", label: "Pixelate" },
  { value: "blur", label: "Blur" },
] as const

function select(value: RedactStyle): void {
  emit("update:modelValue", value)
}
</script>

<template>
  <div
    class="redact-style-picker"
    role="radiogroup"
    aria-label="Redaction style"
  >
    <button
      v-for="option in STYLE_OPTIONS"
      :key="option.value"
      class="redact-style-picker__option"
      :class="{ 'redact-style-picker__option--active': modelValue === option.value }"
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
.redact-style-picker {
  display: flex;
  align-items: center;
  gap: 2px;
}

.redact-style-picker__option {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.1s ease, background-color 0.1s ease, color 0.1s ease;
}

.redact-style-picker__option:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.redact-style-picker__option--active {
  background: var(--surface-panel);
  border-color: var(--interactive-default);
  color: var(--text-primary);
}
</style>
