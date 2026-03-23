<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRef } from "vue"
import type { RedactionState } from "../composables/useRedaction"
import { renderRedactionRegion } from "../composables/useRedaction"

const props = defineProps<{
  redactionState: RedactionState
  imageWidth: number
  imageHeight: number
  baseImageUrl: string
  /** Optional freehand canvas element to composite before redaction */
  freehandCanvas?: HTMLCanvasElement | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let baseImage: HTMLImageElement | null = null

/** Hidden working canvas used to accumulate base + freehand + prior redactions */
let workCanvas: HTMLCanvasElement | null = null
let workCtx: CanvasRenderingContext2D | null = null

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = props.imageWidth
  canvas.height = props.imageHeight
  ctx = canvas.getContext("2d")

  // Create working canvas for accumulation
  workCanvas = document.createElement("canvas")
  workCanvas.width = props.imageWidth
  workCanvas.height = props.imageHeight
  workCtx = workCanvas.getContext("2d")

  await loadBaseImage()
  renderAll()
})

onUnmounted(() => {
  baseImage = null
  workCtx = null
  workCanvas = null
})

/** Load the base image element for compositing. */
async function loadBaseImage(): Promise<void> {
  baseImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("Failed to load base image"))
    el.src = props.baseImageUrl
  })
}

/**
 * Build a working canvas with base image + freehand drawings composited,
 * then apply each redaction region sequentially so they stack correctly.
 * Finally, copy only the redacted areas to the visible output canvas.
 */
function renderAll(): void {
  if (!ctx || !workCtx || !baseImage) return
  const { imageWidth: w, imageHeight: h } = props

  // 1. Composite base image + freehand into working canvas
  workCtx.clearRect(0, 0, w, h)
  workCtx.drawImage(baseImage, 0, 0)
  if (props.freehandCanvas) {
    workCtx.drawImage(props.freehandCanvas, 0, 0)
  }

  // 2. Apply each redaction to the working canvas (reads from + writes to itself)
  const regions = props.redactionState.regions.value
  for (const region of regions) {
    renderRedactionRegion(workCtx, region, workCtx)
  }

  // 3. Copy only the redacted areas to the visible output canvas
  ctx.clearRect(0, 0, w, h)
  for (const region of regions) {
    if (region.width <= 0 || region.height <= 0) continue
    ctx.drawImage(
      workCtx.canvas,
      region.x, region.y, region.width, region.height,
      region.x, region.y, region.width, region.height,
    )
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

// Re-render when freehand canvas content changes (detected via the prop reference)
watch(
  () => props.freehandCanvas,
  () => renderAll(),
)

defineExpose({ renderAll })
</script>

<template>
  <canvas
    ref="canvasRef"
    class="redaction-canvas"
  />
</template>

<style scoped>
.redaction-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}
</style>
