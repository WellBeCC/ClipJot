<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  /** Opacity as a fraction 0–1 */
  modelValue: number
}>()

const emit = defineEmits<{
  "update:modelValue": [opacity: number]
}>()

const percentValue = computed(() => Math.round(props.modelValue * 100))

function handleInput(event: Event): void {
  const input = event.target as HTMLInputElement
  emit("update:modelValue", Number(input.value) / 100)
}
</script>

<template>
  <div class="opacity-slider" role="group" aria-label="Opacity">
    <label class="opacity-slider__label" for="opacity-range">
      {{ percentValue }}%
    </label>
    <input
      id="opacity-range"
      type="range"
      class="opacity-slider__input"
      :value="percentValue"
      min="0"
      max="100"
      step="5"
      aria-label="Opacity"
      @input="handleInput"
    />
    <span
      class="opacity-slider__preview"
      :style="{ opacity: modelValue }"
    />
  </div>
</template>

<style scoped>
.opacity-slider {
  display: flex;
  align-items: center;
  gap: 6px;
}

.opacity-slider__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
  user-select: none;
}

.opacity-slider__input {
  width: 80px;
  height: 4px;
  accent-color: var(--interactive-default);
  cursor: pointer;
}

.opacity-slider__preview {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  border: 1px solid var(--border-default);
}
</style>
