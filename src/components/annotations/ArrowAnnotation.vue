<script setup lang="ts">
import { computed } from "vue"
import type { ArrowAnnotation } from "../../types/annotations"

const props = defineProps<{
  annotation: ArrowAnnotation
}>()

const HIT_AREA_WIDTH = 16

/** Arrowhead dimensions scale with stroke width for visual balance */
const arrowheadSize = computed(() => {
  const sw = props.annotation.strokeWidth
  const length = Math.max(16, 10 + sw * 3)
  const width = Math.max(10, 6 + sw * 2)
  return { length, width }
})

/** Absolute control point (controlX/Y are relative to the midpoint) */
const controlAbs = computed(() => {
  const midX = (props.annotation.x + props.annotation.endX) / 2
  const midY = (props.annotation.y + props.annotation.endY) / 2
  return {
    x: midX + props.annotation.controlX,
    y: midY + props.annotation.controlY,
  }
})

/** Quadratic Bezier path: M start Q control end */
const bezierPath = computed(() => {
  const { x, y, endX, endY } = props.annotation
  const cp = controlAbs.value
  return `M ${x} ${y} Q ${cp.x} ${cp.y} ${endX} ${endY}`
})

/**
 * Arrowhead polygon points oriented along the curve tangent at the endpoint.
 * For a quadratic Bezier, the tangent at t=1 is the direction from the
 * control point to the endpoint.
 */
const arrowheadPoints = computed(() => {
  const { endX, endY } = props.annotation
  const cp = controlAbs.value

  // Direction from control point to end (tangent at t=1)
  const dx = endX - cp.x
  const dy = endY - cp.y
  const len = Math.sqrt(dx * dx + dy * dy)

  // Avoid division by zero for degenerate curves
  if (len === 0) {
    return `${endX},${endY} ${endX},${endY} ${endX},${endY}`
  }

  // Unit tangent
  const ux = dx / len
  const uy = dy / len

  // Perpendicular
  const px = -uy
  const py = ux

  const { length: ahLength, width: ahWidth } = arrowheadSize.value

  // Arrowhead tip is at the endpoint
  const tipX = endX
  const tipY = endY

  // Base of arrowhead (offset back along tangent)
  const baseX = endX - ux * ahLength
  const baseY = endY - uy * ahLength

  // Two wing points
  const leftX = baseX + px * ahWidth
  const leftY = baseY + py * ahWidth
  const rightX = baseX - px * ahWidth
  const rightY = baseY - py * ahWidth

  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`
})
</script>

<template>
  <g class="arrow-annotation" :data-annotation-id="annotation.id">
    <!-- Invisible wide hit area for easier selection -->
    <path
      :d="bezierPath"
      fill="none"
      stroke="transparent"
      :stroke-width="HIT_AREA_WIDTH"
      stroke-linecap="round"
      class="arrow-hit-area"
    />

    <!-- Visible Bezier curve -->
    <path
      :d="bezierPath"
      fill="none"
      :stroke="annotation.strokeColor"
      :stroke-width="annotation.strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Arrowhead polygon -->
    <polygon
      :points="arrowheadPoints"
      :fill="annotation.strokeColor"
      :stroke="annotation.strokeColor"
      stroke-width="1"
      stroke-linejoin="round"
    />

    <!-- Selection visuals: dashed guide lines + control point -->
    <template v-if="annotation.selected">
      <!-- Guide line: start to control point -->
      <line
        :x1="annotation.x"
        :y1="annotation.y"
        :x2="controlAbs.x"
        :y2="controlAbs.y"
        stroke="#AF3029"
        stroke-width="1"
        stroke-dasharray="4 3"
        class="arrow-guide-line"
      />
      <!-- Guide line: control point to end -->
      <line
        :x1="controlAbs.x"
        :y1="controlAbs.y"
        :x2="annotation.endX"
        :y2="annotation.endY"
        stroke="#AF3029"
        stroke-width="1"
        stroke-dasharray="4 3"
        class="arrow-guide-line"
      />
      <!-- Control point handle -->
      <circle
        :cx="controlAbs.x"
        :cy="controlAbs.y"
        r="5"
        fill="#AF3029"
        stroke="white"
        stroke-width="1.5"
        class="arrow-control-handle"
        style="cursor: move; pointer-events: auto"
      />
    </template>
  </g>
</template>

<style scoped>
.arrow-hit-area {
  pointer-events: stroke;
  cursor: pointer;
}

.arrow-guide-line {
  pointer-events: none;
}
</style>
