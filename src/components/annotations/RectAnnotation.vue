<script setup lang="ts">
import type { RectAnnotation } from "../../types/annotations"

const props = defineProps<{
  annotation: RectAnnotation
}>()

const emit = defineEmits<{
  select: [id: string, additive: boolean]
}>()

const HIT_AREA_WIDTH = 16

function onPointerDown(e: PointerEvent): void {
  e.stopPropagation()
  emit("select", props.annotation.id, e.shiftKey || e.metaKey)
}
</script>

<template>
  <g
    class="rect-annotation"
    :data-annotation-id="annotation.id"
    @pointerdown="onPointerDown"
  >
    <!-- Invisible wide hit area for easier selection -->
    <rect
      :x="annotation.x - HIT_AREA_WIDTH / 2"
      :y="annotation.y - HIT_AREA_WIDTH / 2"
      :width="annotation.width + HIT_AREA_WIDTH"
      :height="annotation.height + HIT_AREA_WIDTH"
      fill="transparent"
      stroke="transparent"
      :stroke-width="HIT_AREA_WIDTH"
      class="rect-hit-area"
    />

    <!-- Visible rectangle -->
    <rect
      :x="annotation.x"
      :y="annotation.y"
      :width="annotation.width"
      :height="annotation.height"
      :stroke="annotation.strokeColor"
      :stroke-width="annotation.strokeWidth"
      :fill="
        annotation.fill
          ? annotation.fillColor
          : 'none'
      "
      :fill-opacity="annotation.fill ? annotation.fillOpacity : undefined"
    />
  </g>
</template>

<style scoped>
.rect-hit-area {
  pointer-events: fill;
  cursor: pointer;
}
</style>
