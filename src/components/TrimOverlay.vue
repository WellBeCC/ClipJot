<script setup lang="ts">
import type { CropBounds } from "../types/crop"

const props = defineProps<{
  suggestion: CropBounds
  imageWidth: number
  imageHeight: number
}>()

const emit = defineEmits<{
  accept: []
  dismiss: []
}>()
</script>

<template>
  <div class="trim-overlay">
    <!-- Top dim region -->
    <div
      class="trim-overlay__dim"
      :style="{
        top: 0,
        left: 0,
        width: props.imageWidth + 'px',
        height: props.suggestion.y + 'px',
      }"
    />
    <!-- Bottom dim region -->
    <div
      class="trim-overlay__dim"
      :style="{
        top: props.suggestion.y + props.suggestion.height + 'px',
        left: 0,
        width: props.imageWidth + 'px',
        height:
          props.imageHeight -
          props.suggestion.y -
          props.suggestion.height +
          'px',
      }"
    />
    <!-- Left dim region -->
    <div
      class="trim-overlay__dim"
      :style="{
        top: props.suggestion.y + 'px',
        left: 0,
        width: props.suggestion.x + 'px',
        height: props.suggestion.height + 'px',
      }"
    />
    <!-- Right dim region -->
    <div
      class="trim-overlay__dim"
      :style="{
        top: props.suggestion.y + 'px',
        left: props.suggestion.x + props.suggestion.width + 'px',
        width:
          props.imageWidth -
          props.suggestion.x -
          props.suggestion.width +
          'px',
        height: props.suggestion.height + 'px',
      }"
    />
    <!-- Accept button -->
    <button class="trim-overlay__btn" @click="emit('accept')">Trim</button>
  </div>
</template>

<style scoped>
.trim-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}

.trim-overlay__dim {
  position: absolute;
  background: var(--overlay-dim);
  pointer-events: none;
}

.trim-overlay__btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 20px;
  background: var(--interactive-default);
  color: var(--text-inverse);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: var(--shadow-md);
  transition: background 0.15s;
}

.trim-overlay__btn:hover {
  background: var(--interactive-hover);
}
</style>
