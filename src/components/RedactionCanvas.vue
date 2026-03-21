<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRef } from "vue"
import type { RedactionState } from "../composables/useRedaction"
import { renderRedactionRegion } from "../composables/useRedaction"

const props = defineProps<{
  redactionState: RedactionState
  imageWidth: number
  imageHeight: number
  baseImageUrl: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let baseCanvas: OffscreenCanvas | null = null
let baseCtx: CanvasRenderingContext2D | null = null

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = props.imageWidth
  canvas.height = props.imageHeight
  ctx = canvas.getContext("2d")

  await loadBaseImage()
  renderAll()
})

onUnmounted(() => {
  baseCanvas = null
  baseCtx = null
})

/** Load the base image into an offscreen canvas for pixel reading */
async function loadBaseImage(): Promise<void> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("Failed to load base image"))
    el.src = props.baseImageUrl
  })

  baseCanvas = new OffscreenCanvas(props.imageWidth, props.imageHeight)
  const offCtx = baseCanvas.getContext("2d")
  if (offCtx) {
    offCtx.drawImage(img, 0, 0)
    baseCtx = offCtx as unknown as CanvasRenderingContext2D
  }
}

/** Clear and re-render all redaction regions */
function renderAll(): void {
  if (!ctx || !baseCtx) return
  ctx.clearRect(0, 0, props.imageWidth, props.imageHeight)

  for (const region of props.redactionState.regions.value) {
    renderRedactionRegion(ctx, region, baseCtx)
  }
}

// Re-render when regions change (add/remove/mutate via undo/redo)
const regionsRef = toRef(() => props.redactionState.regions.value)
watch(regionsRef, renderAll)

// Re-render if the base image URL changes
watch(
  () => props.baseImageUrl,
  async () => {
    await loadBaseImage()
    renderAll()
  },
)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="redaction-canvas"
    :style="{ width: imageWidth + 'px', height: imageHeight + 'px' }"
  />
</template>

<style scoped>
.redaction-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}
</style>
