<script setup lang="ts">
import { ref, computed } from "vue"

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  "update:modelValue": [color: string]
}>()

/**
 * Flexoki annotation swatches — resolved hex values.
 * Displayed using semantic CSS custom properties for theme adaptation,
 * but the stored value is always the hex for canvas rendering.
 */
const SWATCHES: readonly { hex: string; token: string; label: string }[] = [
  { hex: "#D14D41", token: "--annotation-red", label: "Red" },
  { hex: "#DA702C", token: "--annotation-orange", label: "Orange" },
  { hex: "#D0A215", token: "--annotation-yellow", label: "Yellow" },
  { hex: "#879A39", token: "--annotation-green", label: "Green" },
  { hex: "#3AA99F", token: "--annotation-cyan", label: "Cyan" },
  { hex: "#4385BE", token: "--annotation-blue", label: "Blue" },
  { hex: "#8B7EC8", token: "--annotation-purple", label: "Purple" },
  { hex: "#CE5D97", token: "--annotation-magenta", label: "Magenta" },
  { hex: "#100F0F", token: "--annotation-black", label: "Black" },
  { hex: "#FFFCF0", token: "--annotation-white", label: "White" },
] as const

/** Module-level recent colors (shared across all ColorPicker instances) */
const recentColors = ref<string[]>([])
const MAX_RECENT = 8

function addToRecent(color: string): void {
  const normalized = color.toUpperCase()
  const isBuiltinSwatch = SWATCHES.some(
    (s) => s.hex.toUpperCase() === normalized,
  )
  if (isBuiltinSwatch) return

  const filtered = recentColors.value.filter(
    (c) => c.toUpperCase() !== normalized,
  )
  recentColors.value = [color, ...filtered].slice(0, MAX_RECENT)
}

function selectSwatch(hex: string): void {
  emit("update:modelValue", hex)
}

function selectRecent(color: string): void {
  emit("update:modelValue", color)
}

function handleCustomColor(event: Event): void {
  const input = event.target as HTMLInputElement
  const color = input.value
  addToRecent(color)
  emit("update:modelValue", color)
}

const isCustomColor = computed(() => {
  const upper = props.modelValue.toUpperCase()
  return (
    !SWATCHES.some((s) => s.hex.toUpperCase() === upper) &&
    !recentColors.value.some((c) => c.toUpperCase() === upper)
  )
})
</script>

<template>
  <div class="color-picker" role="group" aria-label="Color picker">
    <div class="color-picker__swatches" role="radiogroup" aria-label="Preset colors">
      <button
        v-for="swatch in SWATCHES"
        :key="swatch.hex"
        class="color-picker__swatch"
        :class="{ 'color-picker__swatch--active': modelValue.toUpperCase() === swatch.hex.toUpperCase() }"
        :style="{ backgroundColor: `var(${swatch.token})` }"
        :aria-label="swatch.label"
        :aria-checked="modelValue.toUpperCase() === swatch.hex.toUpperCase()"
        role="radio"
        type="button"
        @click="selectSwatch(swatch.hex)"
      />
      <label
        class="color-picker__custom"
        :class="{ 'color-picker__custom--active': isCustomColor }"
        aria-label="Custom color"
      >
        <input
          type="color"
          class="color-picker__custom-input"
          :value="modelValue"
          @input="handleCustomColor"
        />
        <span class="color-picker__custom-icon">+</span>
      </label>
    </div>
    <div
      v-if="recentColors.length > 0"
      class="color-picker__recent"
      role="radiogroup"
      aria-label="Recent colors"
    >
      <button
        v-for="color in recentColors"
        :key="color"
        class="color-picker__swatch color-picker__swatch--recent"
        :class="{ 'color-picker__swatch--active': modelValue.toUpperCase() === color.toUpperCase() }"
        :style="{ backgroundColor: color }"
        :aria-label="`Recent: ${color}`"
        :aria-checked="modelValue.toUpperCase() === color.toUpperCase()"
        role="radio"
        type="button"
        @click="selectRecent(color)"
      />
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-picker__swatches {
  display: flex;
  align-items: center;
  gap: 3px;
}

.color-picker__swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: border-color 0.1s ease;
}

.color-picker__swatch:hover {
  border-color: var(--border-strong);
}

.color-picker__swatch--active {
  border-color: var(--interactive-default);
  box-shadow: var(--shadow-sm);
}

.color-picker__swatch--recent {
  width: 16px;
  height: 16px;
}

.color-picker__custom {
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px dashed var(--border-default);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.1s ease;
}

.color-picker__custom:hover {
  border-color: var(--border-strong);
}

.color-picker__custom--active {
  border-color: var(--interactive-default);
}

.color-picker__custom-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.color-picker__custom-icon {
  font-size: 12px;
  line-height: 1;
  color: var(--text-secondary);
  pointer-events: none;
}

.color-picker__recent {
  display: flex;
  align-items: center;
  gap: 3px;
}
</style>
