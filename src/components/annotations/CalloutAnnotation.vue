<script setup lang="ts">
import { computed } from "vue"
import type { CalloutAnnotation } from "../../types/annotations"

const props = defineProps<{
  annotation: CalloutAnnotation
}>()

/**
 * Parse a hex color string (#rgb or #rrggbb) into [r, g, b] in 0-255 range.
 */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ]
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/**
 * Compute relative luminance per WCAG 2.0.
 * Returns a value between 0 (darkest) and 1 (lightest).
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const textColor = computed(() =>
  relativeLuminance(props.annotation.fillColor) < 0.5
    ? "#ffffff"
    : "#000000",
)
</script>

<template>
  <g
    :transform="`translate(${annotation.x}, ${annotation.y})${annotation.rotation ? ` rotate(${annotation.rotation})` : ''}`"
  >
    <circle
      :r="annotation.radius"
      :fill="annotation.fillColor"
      :stroke="annotation.strokeColor"
      :stroke-width="annotation.strokeWidth"
    />
    <text
      text-anchor="middle"
      dominant-baseline="central"
      :fill="textColor"
      :font-size="annotation.radius"
      font-family="system-ui, -apple-system, sans-serif"
      font-weight="bold"
      style="pointer-events: none; user-select: none"
    >
      {{ annotation.number }}
    </text>
  </g>
</template>
