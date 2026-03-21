<script setup lang="ts">
import type { LineAnnotation } from "../../types/annotations"

defineProps<{
  annotation: LineAnnotation
}>()

const HIT_AREA_WIDTH = 16
</script>

<template>
  <g class="line-annotation" :data-annotation-id="annotation.id">
    <!-- Invisible wide hit area for easier selection -->
    <line
      :x1="annotation.x"
      :y1="annotation.y"
      :x2="annotation.endX"
      :y2="annotation.endY"
      stroke="transparent"
      :stroke-width="HIT_AREA_WIDTH"
      stroke-linecap="round"
      class="line-hit-area"
    />

    <!-- Visible line -->
    <line
      :x1="annotation.x"
      :y1="annotation.y"
      :x2="annotation.endX"
      :y2="annotation.endY"
      :stroke="annotation.strokeColor"
      :stroke-width="annotation.strokeWidth"
      stroke-linecap="round"
    />
  </g>
</template>

<style scoped>
.line-hit-area {
  pointer-events: stroke;
  cursor: pointer;
}
</style>
