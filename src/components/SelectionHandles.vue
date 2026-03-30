<script setup lang="ts">
import { computed } from "vue"
import type {
  Annotation,
  ArrowAnnotation,
  LineAnnotation,
  CalloutAnnotation,
} from "../types/annotations"

const props = defineProps<{
  annotation: Annotation
  bounds: { x: number; y: number; width: number; height: number }
}>()

const emit = defineEmits<{
  /** Live patch during drag (no undo) */
  "update": [annotationId: string, patch: Partial<Annotation>]
  /** Final commit at drag end (for undo command) */
  "update-commit": [
    annotationId: string,
    before: Partial<Annotation>,
    after: Partial<Annotation>,
  ]
  /** Text-specific width lock (existing event) */
  "resize-text": [annotationId: string, width: number, newX: number]
}>()

const handleSize = 8
const halfHandle = handleSize / 2

const annotationType = computed(() => props.annotation.type)

// ── Handle configuration per annotation type ────────────────────────────────

type HandleDef = { id: string; cursor: string }

const allBoundsHandles: HandleDef[] = [
  { id: "tl", cursor: "nwse-resize" },
  { id: "tm", cursor: "ns-resize" },
  { id: "tr", cursor: "nesw-resize" },
  { id: "mr", cursor: "ew-resize" },
  { id: "br", cursor: "nwse-resize" },
  { id: "bm", cursor: "ns-resize" },
  { id: "bl", cursor: "nesw-resize" },
  { id: "ml", cursor: "ew-resize" },
]

const handlePositions = computed<HandleDef[]>(() => {
  const type = annotationType.value
  if (type === "text") {
    return allBoundsHandles.filter((h) => h.id === "ml" || h.id === "mr")
  }
  // Line/arrow: endpoint handles positioned at start and end
  if (type === "line" || type === "arrow") return []
  // Callout: corner handles to resize radius
  if (type === "callout") {
    return allBoundsHandles.filter(
      (h) => h.id === "tl" || h.id === "tr" || h.id === "br" || h.id === "bl",
    )
  }
  return allBoundsHandles
})

/** Endpoint handles for line/arrow annotations */
const endpointHandles = computed(() => {
  const type = annotationType.value
  if (type !== "line" && type !== "arrow") return []
  const a = props.annotation as LineAnnotation | ArrowAnnotation
  return [
    { id: "start", x: a.x, y: a.y, cursor: "move" },
    { id: "end", x: a.endX, y: a.endY, cursor: "move" },
  ]
})

/** Arrow bezier control handle */
const isArrow = computed(() => annotationType.value === "arrow")
const controlPointPos = computed(() => {
  if (!isArrow.value) return { x: 0, y: 0 }
  const a = props.annotation as ArrowAnnotation
  const midX = (a.x + a.endX) / 2
  const midY = (a.y + a.endY) / 2
  return { x: midX + a.controlX, y: midY + a.controlY }
})

function getHandleXY(
  position: string,
  b: { x: number; y: number; width: number; height: number },
): { hx: number; hy: number } {
  const { x, y, width, height } = b
  switch (position) {
    case "tl": return { hx: x, hy: y }
    case "tm": return { hx: x + width / 2, hy: y }
    case "tr": return { hx: x + width, hy: y }
    case "mr": return { hx: x + width, hy: y + height / 2 }
    case "br": return { hx: x + width, hy: y + height }
    case "bm": return { hx: x + width / 2, hy: y + height }
    case "bl": return { hx: x, hy: y + height }
    case "ml": return { hx: x, hy: y + height / 2 }
    default: return { hx: x, hy: y }
  }
}

// ── SVG coordinate conversion ───────────────────────────────────────────────

let dragSvgCTM: DOMMatrix | null = null

function screenToSvg(screenX: number, screenY: number): { x: number; y: number } {
  if (!dragSvgCTM) return { x: screenX, y: screenY }
  return {
    x: (screenX - dragSvgCTM.e) / dragSvgCTM.a,
    y: (screenY - dragSvgCTM.f) / dragSvgCTM.d,
  }
}

function captureCTM(target: SVGElement): void {
  const svgEl = target.ownerSVGElement
  if (svgEl) dragSvgCTM = svgEl.getScreenCTM() ?? null
}

// ── Snapshot for undo ───────────────────────────────────────────────────────

let beforeSnapshot: Partial<Annotation> = {}

function captureSnapshot(): void {
  const a = props.annotation
  switch (a.type) {
    case "rect":
    case "ellipse":
      beforeSnapshot = { x: a.x, y: a.y, width: a.width, height: a.height }
      break
    case "arrow":
      beforeSnapshot = {
        x: a.x, y: a.y, endX: a.endX, endY: a.endY,
        controlX: a.controlX, controlY: a.controlY,
      }
      break
    case "line":
      beforeSnapshot = { x: a.x, y: a.y, endX: a.endX, endY: a.endY }
      break
    case "callout":
      beforeSnapshot = { x: a.x, y: a.y, radius: a.radius }
      break
    case "text":
      beforeSnapshot = { x: a.x, y: a.y, width: a.width, height: a.height }
      break
  }
}

function currentPatch(): Partial<Annotation> {
  const a = props.annotation
  switch (a.type) {
    case "rect":
    case "ellipse":
      return { x: a.x, y: a.y, width: a.width, height: a.height }
    case "arrow":
      return {
        x: a.x, y: a.y, endX: a.endX, endY: a.endY,
        controlX: a.controlX, controlY: a.controlY,
      }
    case "line":
      return { x: a.x, y: a.y, endX: a.endX, endY: a.endY }
    case "callout":
      return { x: a.x, y: a.y, radius: a.radius }
    case "text":
      return { x: a.x, y: a.y, width: a.width, height: a.height }
    default:
      return {}
  }
}

function commitDrag(): void {
  const after = currentPatch()
  emit("update-commit", props.annotation.id, beforeSnapshot, after)
  beforeSnapshot = {}
}

// ── Move (bounding box drag) ────────────────────────────────────────────────

let moveStartScreen = { x: 0, y: 0 }
let moveStartSvg = { x: 0, y: 0 }
let moveOrigAnnotation: Record<string, number> = {}

function onBoundsPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()

  captureCTM(e.currentTarget as SVGElement)
  captureSnapshot()

  moveStartScreen = { x: e.clientX, y: e.clientY }
  moveStartSvg = screenToSvg(e.clientX, e.clientY)

  // Capture original positions for all relevant fields
  const a = props.annotation
  if (a.type === "arrow" || a.type === "line") {
    moveOrigAnnotation = { x: a.x, y: a.y, endX: a.endX, endY: a.endY }
    if (a.type === "arrow") {
      moveOrigAnnotation.controlX = a.controlX
      moveOrigAnnotation.controlY = a.controlY
    }
  } else {
    moveOrigAnnotation = { x: a.x, y: a.y }
  }

  const target = e.currentTarget as SVGElement
  target.setPointerCapture(e.pointerId)
  target.addEventListener("pointermove", onBoundsPointerMove)
  target.addEventListener("pointerup", onBoundsPointerUp)
}

function onBoundsPointerMove(e: PointerEvent): void {
  const cur = screenToSvg(e.clientX, e.clientY)
  const dx = cur.x - moveStartSvg.x
  const dy = cur.y - moveStartSvg.y

  const a = props.annotation
  let patch: Partial<Annotation>

  if (a.type === "arrow" || a.type === "line") {
    patch = {
      x: moveOrigAnnotation.x + dx,
      y: moveOrigAnnotation.y + dy,
      endX: moveOrigAnnotation.endX + dx,
      endY: moveOrigAnnotation.endY + dy,
    }
  } else {
    patch = {
      x: moveOrigAnnotation.x + dx,
      y: moveOrigAnnotation.y + dy,
    }
  }

  emit("update", a.id, patch)
}

function onBoundsPointerUp(e: PointerEvent): void {
  const target = e.currentTarget as SVGElement
  target.removeEventListener("pointermove", onBoundsPointerMove)
  target.removeEventListener("pointerup", onBoundsPointerUp)
  target.releasePointerCapture(e.pointerId)
  dragSvgCTM = null
  commitDrag()
}

// ── Resize handles (rect/ellipse/callout) ───────────────────────────────────

let resizeHandleId = ""
let resizeStartSvg = { x: 0, y: 0 }
let resizeOrigBounds = { x: 0, y: 0, width: 0, height: 0 }

function onHandlePointerDown(e: PointerEvent, handleId: string): void {
  e.preventDefault()
  e.stopPropagation()

  // Text handles use the existing resize-text event
  if (annotationType.value === "text") {
    onTextHandlePointerDown(e, handleId)
    return
  }

  captureCTM(e.currentTarget as SVGElement)
  captureSnapshot()

  resizeHandleId = handleId
  resizeStartSvg = screenToSvg(e.clientX, e.clientY)
  resizeOrigBounds = { ...props.bounds }

  const target = e.currentTarget as SVGElement
  target.setPointerCapture(e.pointerId)
  target.addEventListener("pointermove", onHandlePointerMove)
  target.addEventListener("pointerup", onHandlePointerUp)
}

function onHandlePointerMove(e: PointerEvent): void {
  const cur = screenToSvg(e.clientX, e.clientY)
  const dx = cur.x - resizeStartSvg.x
  const dy = cur.y - resizeStartSvg.y
  const ob = resizeOrigBounds

  // Compute new bounds based on which handle is being dragged
  let nx = ob.x, ny = ob.y, nw = ob.width, nh = ob.height

  if (resizeHandleId.includes("l")) { nx = ob.x + dx; nw = ob.width - dx }
  if (resizeHandleId.includes("r")) { nw = ob.width + dx }
  if (resizeHandleId.includes("t")) { ny = ob.y + dy; nh = ob.height - dy }
  if (resizeHandleId.includes("b")) { nh = ob.height + dy }

  // Enforce minimums
  const MIN_SIZE = 5
  if (nw < MIN_SIZE) { if (resizeHandleId.includes("l")) nx = ob.x + ob.width - MIN_SIZE; nw = MIN_SIZE }
  if (nh < MIN_SIZE) { if (resizeHandleId.includes("t")) ny = ob.y + ob.height - MIN_SIZE; nh = MIN_SIZE }

  const newBounds = { x: nx, y: ny, width: nw, height: nh }

  const type = annotationType.value
  let patch: Partial<Annotation>

  if (type === "rect" || type === "ellipse") {
    patch = { x: newBounds.x, y: newBounds.y, width: newBounds.width, height: newBounds.height }
  } else if (type === "callout") {
    // Callout: derive center + radius from bounds
    const radius = Math.max(MIN_SIZE, Math.min(newBounds.width, newBounds.height) / 2)
    patch = {
      x: newBounds.x + newBounds.width / 2,
      y: newBounds.y + newBounds.height / 2,
      radius,
    }
  } else {
    return
  }

  emit("update", props.annotation.id, patch)
}

function onHandlePointerUp(e: PointerEvent): void {
  const target = e.currentTarget as SVGElement
  target.removeEventListener("pointermove", onHandlePointerMove)
  target.removeEventListener("pointerup", onHandlePointerUp)
  target.releasePointerCapture(e.pointerId)
  resizeHandleId = ""
  dragSvgCTM = null
  commitDrag()
}

// ── Endpoint handles (line/arrow) ───────────────────────────────────────────

let endpointId = ""
let endpointStartSvg = { x: 0, y: 0 }
let endpointOrig = { x: 0, y: 0 }

function onEndpointPointerDown(e: PointerEvent, id: string): void {
  e.preventDefault()
  e.stopPropagation()

  captureCTM(e.currentTarget as SVGElement)
  captureSnapshot()

  endpointId = id
  endpointStartSvg = screenToSvg(e.clientX, e.clientY)

  const a = props.annotation as LineAnnotation | ArrowAnnotation
  endpointOrig = id === "start"
    ? { x: a.x, y: a.y }
    : { x: a.endX, y: a.endY }

  const target = e.currentTarget as SVGElement
  target.setPointerCapture(e.pointerId)
  target.addEventListener("pointermove", onEndpointPointerMove)
  target.addEventListener("pointerup", onEndpointPointerUp)
}

function onEndpointPointerMove(e: PointerEvent): void {
  const cur = screenToSvg(e.clientX, e.clientY)
  const dx = cur.x - endpointStartSvg.x
  const dy = cur.y - endpointStartSvg.y

  const patch: Partial<Annotation> = endpointId === "start"
    ? { x: endpointOrig.x + dx, y: endpointOrig.y + dy }
    : { endX: endpointOrig.x + dx, endY: endpointOrig.y + dy }

  emit("update", props.annotation.id, patch)
}

function onEndpointPointerUp(e: PointerEvent): void {
  const target = e.currentTarget as SVGElement
  target.removeEventListener("pointermove", onEndpointPointerMove)
  target.removeEventListener("pointerup", onEndpointPointerUp)
  target.releasePointerCapture(e.pointerId)
  endpointId = ""
  dragSvgCTM = null
  commitDrag()
}

// ── Bezier control point drag (arrow) ───────────────────────────────────────

let controlStartSvg = { x: 0, y: 0 }
let controlOrigPos = { x: 0, y: 0 }

function onControlPointerDown(e: PointerEvent): void {
  e.preventDefault()
  e.stopPropagation()

  captureCTM(e.currentTarget as SVGElement)
  captureSnapshot()

  controlStartSvg = screenToSvg(e.clientX, e.clientY)
  controlOrigPos = { ...controlPointPos.value }

  const target = e.currentTarget as SVGElement
  target.setPointerCapture(e.pointerId)
  target.addEventListener("pointermove", onControlPointerMove)
  target.addEventListener("pointerup", onControlPointerUp)
}

function onControlPointerMove(e: PointerEvent): void {
  const cur = screenToSvg(e.clientX, e.clientY)
  const dx = cur.x - controlStartSvg.x
  const dy = cur.y - controlStartSvg.y

  // controlX/Y are relative to midpoint
  const a = props.annotation as ArrowAnnotation
  const midX = (a.x + a.endX) / 2
  const midY = (a.y + a.endY) / 2
  const newAbsX = controlOrigPos.x + dx
  const newAbsY = controlOrigPos.y + dy

  emit("update", a.id, {
    controlX: newAbsX - midX,
    controlY: newAbsY - midY,
  })
}

function onControlPointerUp(e: PointerEvent): void {
  const target = e.currentTarget as SVGElement
  target.removeEventListener("pointermove", onControlPointerMove)
  target.removeEventListener("pointerup", onControlPointerUp)
  target.releasePointerCapture(e.pointerId)
  dragSvgCTM = null
  commitDrag()
}

// ── Text resize handles (existing behavior, kept separate) ──────────────────

let textDragStartScreenX = 0
let textDragStartWidth = 0
let textDragStartX = 0

function onTextHandlePointerDown(e: PointerEvent, handleId: string): void {
  captureCTM(e.currentTarget as SVGElement)

  resizeHandleId = handleId
  textDragStartScreenX = e.clientX
  textDragStartWidth = props.bounds.width
  textDragStartX = props.bounds.x

  const target = e.currentTarget as SVGElement
  target.setPointerCapture(e.pointerId)
  target.addEventListener("pointermove", onTextHandlePointerMove)
  target.addEventListener("pointerup", onTextHandlePointerUp)
}

function onTextHandlePointerMove(e: PointerEvent): void {
  const startSvgX = screenToSvg(textDragStartScreenX, 0).x
  const curSvgX = screenToSvg(e.clientX, 0).x
  const deltaSvg = curSvgX - startSvgX

  let newWidth: number
  let newX = textDragStartX
  if (resizeHandleId === "mr") {
    newWidth = Math.max(40, textDragStartWidth + deltaSvg)
  } else {
    newWidth = Math.max(40, textDragStartWidth - deltaSvg)
    newX = textDragStartX + (textDragStartWidth - newWidth)
  }

  emit("resize-text", props.annotation.id, Math.ceil(newWidth), newX)
}

function onTextHandlePointerUp(e: PointerEvent): void {
  const target = e.currentTarget as SVGElement
  target.removeEventListener("pointermove", onTextHandlePointerMove)
  target.removeEventListener("pointerup", onTextHandlePointerUp)
  target.releasePointerCapture(e.pointerId)
  resizeHandleId = ""
  dragSvgCTM = null
}
</script>

<template>
  <g class="selection-handles">
    <!-- Bounding box (also serves as move handle) -->
    <rect
      :x="bounds.x"
      :y="bounds.y"
      :width="bounds.width"
      :height="bounds.height"
      fill="transparent"
      stroke="var(--interactive-default)"
      stroke-width="1"
      stroke-dasharray="4 2"
      class="selection-bounds"
      @pointerdown="onBoundsPointerDown"
    />

    <!-- Bounds-based resize handles (rect, ellipse, callout, text) -->
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
      @pointerdown="(e) => onHandlePointerDown(e, handle.id)"
    />

    <!-- Endpoint handles for line/arrow -->
    <rect
      v-for="ep in endpointHandles"
      :key="ep.id"
      :x="ep.x - halfHandle"
      :y="ep.y - halfHandle"
      :width="handleSize"
      :height="handleSize"
      fill="white"
      stroke="var(--interactive-default)"
      stroke-width="1.5"
      rx="1"
      :style="{ cursor: ep.cursor, pointerEvents: 'auto' }"
      @pointerdown="(e) => onEndpointPointerDown(e, ep.id)"
    />

    <!-- Bezier control point handle for arrow -->
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
      @pointerdown="onControlPointerDown"
    />
  </g>
</template>

<style scoped>
.selection-handles {
  pointer-events: none;
}

.selection-bounds {
  pointer-events: auto;
  cursor: move;
}
</style>
