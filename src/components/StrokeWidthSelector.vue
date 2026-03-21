<script setup lang="ts">
defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  "update:modelValue": [width: number]
}>()

interface WidthOption {
  value: number
  label: string
  dotSize: number
}

const WIDTH_OPTIONS: readonly WidthOption[] = [
  { value: 2, label: "Thin", dotSize: 4 },
  { value: 4, label: "Medium", dotSize: 8 },
  { value: 8, label: "Thick", dotSize: 14 },
] as const

function select(value: number): void {
  emit("update:modelValue", value)
}
</script>

<template>
  <div
    class="stroke-width-selector"
    role="radiogroup"
    aria-label="Stroke width"
  >
    <button
      v-for="option in WIDTH_OPTIONS"
      :key="option.value"
      class="stroke-width-selector__option"
      :class="{ 'stroke-width-selector__option--active': modelValue === option.value }"
      :aria-label="option.label"
      :aria-checked="modelValue === option.value"
      role="radio"
      type="button"
      @click="select(option.value)"
    >
      <span
        class="stroke-width-selector__dot"
        :style="{ width: `${option.dotSize}px`, height: `${option.dotSize}px` }"
      />
    </button>
  </div>
</template>

<style scoped>
.stroke-width-selector {
  display: flex;
  align-items: center;
  gap: 2px;
}

.stroke-width-selector__option {
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

.stroke-width-selector__option:hover {
  background: var(--surface-panel);
  border-color: var(--border-subtle);
}

.stroke-width-selector__option--active {
  background: var(--surface-panel);
  border-color: var(--interactive-default);
}

.stroke-width-selector__dot {
  border-radius: 50%;
  background: var(--text-primary);
}
</style>
