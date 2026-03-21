<script setup lang="ts">
import { computed } from "vue"
import type { EllipseAnnotation } from "../../types/annotations"

const props = defineProps<{
  annotation: EllipseAnnotation
}>()

const emit = defineEmits<{
  select: [id: string, additive: boolean]
}>()

const HIT_AREA_WIDTH = 16

/** Center point derived from x/y/width/height bounding box */
const cx = computed(() => props.annotation.x + props.annotation.width / 2)
const cy = computed(() => props.annotation.y + props.annotation.height / 2)
const rx = computed(() => props.annotation.width / 2)
const ry = computed(() => props.annotation.height / 2)

function onPointerDown(e: PointerEvent): void {
  e.stopPropagation()
  emit("select", props.annotation.id, e.shiftKey || e.metaKey)
}
</script>

<template>
  <g
    class="ellipse-annotation"
    :data-annotation-id="annotation.id"
    @pointerdown="onPointerDown"
  >
    <!-- Invisible wide hit area for easier selection -->
    <ellipse
      :cx="cx"
      :cy="cy"
      :rx="rx + HIT_AREA_WIDTH / 2"
      :ry="ry + HIT_AREA_WIDTH / 2"
      fill="transparent"
      stroke="transparent"
      :stroke-width="HIT_AREA_WIDTH"
      class="ellipse-hit-area"
    />

    <!-- Visible ellipse -->
    <ellipse
      :cx="cx"
      :cy="cy"
      :rx="rx"
      :ry="ry"
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
.ellipse-hit-area {
  pointer-events: fill;
  cursor: pointer;
}
</style>
