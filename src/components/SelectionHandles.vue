<script setup lang="ts">
import type { Annotation } from "../types/annotations"

defineProps<{
  annotation: Annotation
  bounds: { x: number; y: number; width: number; height: number }
}>()

const handleSize = 8
const halfHandle = handleSize / 2

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
  </g>
</template>

<style scoped>
.selection-handles {
  pointer-events: none;
}
</style>
