<script setup lang="ts">
import { computed } from "vue"
import type { Annotation, ArrowAnnotation } from "../types/annotations"

const props = defineProps<{
  annotation: Annotation
  bounds: { x: number; y: number; width: number; height: number }
}>()

const handleSize = 8
const halfHandle = handleSize / 2

/** Whether this annotation is an arrow with a Bezier control point */
const isArrow = computed(() => props.annotation.type === "arrow")

/** Absolute position of the Bezier control point for arrow annotations */
const controlPointPos = computed(() => {
  if (!isArrow.value) return { x: 0, y: 0 }
  const a = props.annotation as ArrowAnnotation
  const midX = (a.x + a.endX) / 2
  const midY = (a.y + a.endY) / 2
  return {
    x: midX + a.controlX,
    y: midY + a.controlY,
  }
})

// 8 handle positions: tl, tm, tr, mr, br, bm, bl, ml
const handlePositions = [
  { id: "tl", cursor: "nwse-resize" },
  { id: "tm", cursor: "ns-resize" },
  { id: "tr", cursor: "nesw-resize" },
  { id: "mr", cursor: "ew-resize" },
  { id: "br", cursor: "nwse-resize" },
  { id: "bm", cursor: "ns-resize" },
  { id: "bl", cursor: "nesw-resize" },
  { id: "ml", cursor: "ew-resize" },
] as const

function getHandleXY(
  position: string,
  b: { x: number; y: number; width: number; height: number },
): { hx: number; hy: number } {
  const { x, y, width, height } = b
  switch (position) {
    case "tl":
      return { hx: x, hy: y }
    case "tm":
      return { hx: x + width / 2, hy: y }
    case "tr":
      return { hx: x + width, hy: y }
    case "mr":
      return { hx: x + width, hy: y + height / 2 }
    case "br":
      return { hx: x + width, hy: y + height }
    case "bm":
      return { hx: x + width / 2, hy: y + height }
    case "bl":
      return { hx: x, hy: y + height }
    case "ml":
      return { hx: x, hy: y + height / 2 }
    default:
      return { hx: x, hy: y }
  }
}
</script>

<template>
  <g class="selection-handles">
    <!-- Bounding box -->
    <rect
      :x="bounds.x"
      :y="bounds.y"
      :width="bounds.width"
      :height="bounds.height"
      fill="none"
      stroke="var(--interactive-default)"
      stroke-width="1"
      stroke-dasharray="4 2"
    />

    <!-- 8 resize handles -->
    <rect
      v-for="handle in handlePositions"
      :key="handle.id"
      :x="getHandleXY(handle.id, bounds).hx - halfHandle"
      :y="getHandleXY(handle.id, bounds).hy - halfHandle"
      :width="handleSize"
      :height="handleSize"
      fill="white"
      stroke="var(--interactive-default)"
      stroke-width="1.5"
      rx="1"
      :style="{ cursor: handle.cursor, pointerEvents: 'auto' }"
    />

    <!-- Bezier control point handle for arrow annotations -->
    <circle
      v-if="isArrow"
      :cx="controlPointPos.x"
      :cy="controlPointPos.y"
      r="5"
      fill="#AF3029"
      stroke="white"
      stroke-width="1.5"
      class="bezier-control-handle"
      :style="{ cursor: 'move', pointerEvents: 'auto' }"
    />
  </g>
</template>

<style scoped>
.selection-handles {
  pointer-events: none;
}
</style>
