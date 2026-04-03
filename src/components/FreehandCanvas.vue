<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue"
import { getStroke } from "perfect-freehand"
import type { StrokeOptions } from "perfect-freehand"
import type { FreehandStroke } from "../types/freehand"
import type { Command } from "../types/commands"
import { createFreehandStrokeCommand } from "../commands/FreehandStrokeCommand"
import { useToolStore } from "../composables/useToolStore"
import type { FreehandToolSettings } from "../composables/useToolStore"
import { isFreehandTool } from "../types/tools"
import { getSvgPathFromStroke } from "../composables/useDrawing"
import type { DrawingState } from "../composables/useDrawing"
import { useTabStore } from "../composables/useTabStore"

const props = defineProps<{
  drawingState: DrawingState
  imageWidth: number
  imageHeight: number
  undoRedoPush: (cmd: Command) => void
  screenToImage: (sx: number, sy: number) => { x: number; y: number }
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let currentPoints: [number, number, number][] = []
/**
 * Backing canvas for O(1) live stroke preview.
 * Uses drawImage(canvas) instead of getImageData/putImageData
 * to stay GPU-backed and avoid costly CPU readback on large images.
 */
let snapshotCanvas: HTMLCanvasElement | null = null
let snapshotCtx: CanvasRenderingContext2D | null = null
let hasSnapshot = false
let rafId: number | null = null
let isDrawing = false
/** Cached viewport element for coordinate transforms during a stroke */
let viewportEl: HTMLElement | null = null

/** Settings captured at pointerdown for the duration of the stroke */
let strokeSettings: FreehandToolSettings | null = null
let strokeCompositeOp: GlobalCompositeOperation = "source-over"

const { activeTool, getToolSettings } = useToolStore()
const { activeTab, promoteClipboardTab } = useTabStore()

/** Only capture pointer events when a freehand tool is active and an image is loaded */
const pointerEventsStyle = computed(() =>
  isFreehandTool(activeTool.value) && activeTab.value?.imageUrl != null
    ? "auto"
    : "none",
)

function ensureSnapshotCanvas(w: number, h: number): void {
  if (!snapshotCanvas) {
    snapshotCanvas = document.createElement("canvas")
    snapshotCtx = snapshotCanvas.getContext("2d")
  }
  if (snapshotCanvas.width !== w || snapshotCanvas.height !== h) {
    snapshotCanvas.width = w
    snapshotCanvas.height = h
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  // Canvas buffer = image dimensions (B1: no devicePixelRatio multiplication)
  canvas.width = props.imageWidth
  canvas.height = props.imageHeight
  ctx = canvas.getContext("2d")
  ensureSnapshotCanvas(props.imageWidth, props.imageHeight)
  if (ctx) {
    props.drawingState.redrawAll(ctx, props.imageWidth, props.imageHeight)
  }
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})

// Resize canvas when image dimensions change (e.g., switching tabs)
watch(
  [() => props.imageWidth, () => props.imageHeight],
  ([w, h]) => {
    const canvas = canvasRef.value
    if (!canvas || !ctx) return
    canvas.width = w
    canvas.height = h
    ensureSnapshotCanvas(w, h)
    props.drawingState.redrawAll(ctx, w, h)
  },
)

// Re-render when strokes change externally (e.g., undo/redo)
watch(
  () => props.drawingState.strokes.value,
  () => {
    if (ctx && !isDrawing) {
      props.drawingState.redrawAll(ctx, props.imageWidth, props.imageHeight)
    }
  },
)

/**
 * Convert a pointer event to image-space coordinates.
 * Uses clientX/clientY relative to the viewport container (not offsetX/offsetY
 * on the canvas) so the CSS transform applied by zoom/pan is accounted for.
 */
function pointerToImage(e: PointerEvent): { x: number; y: number } | null {
  const rect = viewportEl?.getBoundingClientRect()
  if (!rect) return null
  return props.screenToImage(e.clientX - rect.left, e.clientY - rect.top)
}

function onPointerDown(e: PointerEvent): void {
  if (!ctx || !isFreehandTool(activeTool.value)) return
  if (e.button !== 0) return // Left click only

  // Note: clipboard tab promotion happens after the stroke is committed
  // in onPointerUp, so the first edit is preserved.

  // Cache the viewport container for the duration of this stroke
  viewportEl =
    canvasRef.value?.closest<HTMLElement>(".canvas-viewport") ?? null

  isDrawing = true

  // Capture tool settings at stroke start so mid-stroke tool switches don't affect it
  strokeSettings = getToolSettings(activeTool.value)
  strokeCompositeOp =
    activeTool.value === "eraser" ? "destination-out" : "source-over"

  // Save pre-stroke snapshot for O(1) live rendering (B4).
  // Uses canvas-to-canvas copy (GPU-backed) instead of getImageData (CPU readback).
  if (snapshotCtx && canvasRef.value) {
    snapshotCtx.clearRect(0, 0, props.imageWidth, props.imageHeight)
    snapshotCtx.drawImage(canvasRef.value, 0, 0)
    hasSnapshot = true
  }

  const pt = pointerToImage(e)
  if (!pt) return
  currentPoints = [[pt.x, pt.y, e.pressure || 0.5]]

  // Capture pointer for reliable tracking
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!isDrawing || !ctx) return

  // Collect coalesced events for smooth strokes (B5)
  const events = e.getCoalescedEvents?.() ?? [e]
  for (const ce of events) {
    const pt = pointerToImage(ce)
    if (!pt) continue
    currentPoints.push([pt.x, pt.y, ce.pressure || 0.5])
  }

  // Batch render via rAF
  if (rafId === null) {
    rafId = requestAnimationFrame(renderLiveStroke)
  }
}

/** O(1) live stroke preview: restore snapshot + render current stroke only (B4) */
function renderLiveStroke(): void {
  rafId = null
  if (!ctx || !hasSnapshot || !snapshotCanvas || !strokeSettings) return

  // Restore pre-stroke state via GPU-backed canvas copy
  ctx.clearRect(0, 0, props.imageWidth, props.imageHeight)
  ctx.drawImage(snapshotCanvas, 0, 0)

  const opts: StrokeOptions = strokeSettings.strokeOptions
  const outline = getStroke(currentPoints, opts)
  if (outline.length >= 4) {
    const pathData = getSvgPathFromStroke(outline)
    if (pathData) {
      ctx.save()
      ctx.globalAlpha = strokeSettings.opacity
      ctx.globalCompositeOperation = strokeCompositeOp
      ctx.fillStyle = strokeSettings.color
      ctx.fill(new Path2D(pathData))
      ctx.restore()
    }
  }
}

function onPointerUp(_e: PointerEvent): void {
  if (!isDrawing || !ctx || !strokeSettings) return
  isDrawing = false

  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (currentPoints.length < 2) {
    // Too short — restore pre-stroke state
    if (hasSnapshot && snapshotCanvas) {
      ctx.clearRect(0, 0, props.imageWidth, props.imageHeight)
      ctx.drawImage(snapshotCanvas, 0, 0)
    }
    currentPoints = []
    hasSnapshot = false
    strokeSettings = null
    viewportEl = null
    return
  }

  // Create the completed stroke using captured settings
  const stroke: FreehandStroke = {
    id: crypto.randomUUID(),
    points: [...currentPoints],
    options: { ...strokeSettings.strokeOptions },
    color: strokeSettings.color,
    opacity: strokeSettings.opacity,
    compositeOperation: strokeCompositeOp,
  }

  // Push to undo stack (which adds to strokes array and redraws)
  const cmd = createFreehandStrokeCommand(
    stroke,
    props.drawingState.strokes,
    () => {
      if (ctx) {
        props.drawingState.redrawAll(ctx, props.imageWidth, props.imageHeight)
      }
    },
  )
  props.undoRedoPush(cmd)

  // Promote clipboard tab to editing tab after first edit
  if (activeTab.value?.type === "clipboard") {
    promoteClipboardTab()
  }

  currentPoints = []
  hasSnapshot = false
  strokeSettings = null
  viewportEl = null
}

defineExpose({ canvasRef })
</script>

<template>
  <canvas
    ref="canvasRef"
    class="freehand-canvas"
    :style="{
      pointerEvents: pointerEventsStyle,
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  />
</template>

<style scoped>
.freehand-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  /* pointer-events is set dynamically via :style binding */
  touch-action: none;
}
</style>
