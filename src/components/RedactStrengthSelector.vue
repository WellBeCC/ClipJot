<script setup lang="ts">
import type { RedactStrength } from "../types/tools"

defineProps<{
  modelValue: RedactStrength
}>()

const emit = defineEmits<{
  "update:modelValue": [strength: RedactStrength]
}>()

interface StrengthOption {
  value: RedactStrength
  label: string
  dotSize: number
}

const STRENGTH_OPTIONS: readonly StrengthOption[] = [
  { value: 1, label: "Light", dotSize: 4 },
  { value: 2, label: "Medium", dotSize: 8 },
  { value: 3, label: "Strong", dotSize: 14 },
] as const

function select(value: RedactStrength): void {
  emit("update:modelValue", value)
}
</script>

<template>
  <div
    class="redact-strength-selector"
    role="radiogroup"
    aria-label="Redaction strength"
  >
    <button
      v-for="option in STRENGTH_OPTIONS"
      :key="option.value"
      class="redact-strength-selector__option"
      :class="{ 'redact-strength-selector__option--active': modelValue === option.value }"
      :aria-label="option.label"
      :aria-checked="modelValue === option.value"
      role="radio"
      type="button"
      @click="select(option.value)"
    >
      <span
        class="redact-strength-selector__dot"
        :style="{ width: `${option.dotSize}px`, height: `${option.dotSize}px` }"
      />
    </button>
  </div>
</template>

<style scoped>
.redact-strength-selector {
  display: flex;
  align-items: center;
  gap: 2px;
}

.redact-strength-selector__option {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color 0.1s ease, background-color 0.1s ease;
}

.redact-strength-selector__option:hover {
  background: var(--surface-panel);
  border-color: var(--border-subtle);
}

.redact-strength-selector__option--active {
  background: var(--surface-panel);
  border-color: var(--interactive-default);
}

.redact-strength-selector__dot {
  border-radius: 50%;
  background: var(--text-primary);
}
</style>
