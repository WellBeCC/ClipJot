import { ref, shallowRef } from "vue"
import type { Ref, ShallowRef } from "vue"
import type {
  RectAnnotation,
  EllipseAnnotation,
  Annotation,
} from "../types/annotations"
import type { UndoRedoInstance } from "./useUndoRedo"
import type { AnnotationStoreState } from "./useAnnotationStore"
import { useAnnotationStore } from "./useAnnotationStore"
import { createSvgCreateCommand } from "../commands/SvgCreateCommand"

/** Minimum dimension (px) for a shape to be committed — below this it's discarded */
const MIN_SHAPE_SIZE = 5

export type ShapeType = "rect" | "ellipse"

export interface ShapeCreationPreview {
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  strokeWidth: number
  fill: boolean
  fillColor: string
  fillOpacity: number
}

export interface ShapeCreationOptions {
  strokeColor: string
  strokeWidth: number
  fill?: boolean
  fillColor?: string
  fillOpacity?: number
}

export interface ShapeCreationResult {
  /** Reactive preview shown during drag (null when idle) */
  preview: ShallowRef<ShapeCreationPreview | null>
  /** Whether a drag is in progress */
  isDragging: Ref<boolean>
  /** Call on pointerdown to begin shape creation */
  onPointerDown(
    e: PointerEvent,
    shapeType: ShapeType,
    options: ShapeCreationOptions,
  ): void
  /** Call on pointermove to update the preview */
  onPointerMove(e: PointerEvent): void
  /** Call on pointerup to finalize or discard the shape */
  onPointerUp(e: PointerEvent): void
  /** Cancel an in-progress creation */
  cancel(): void
}

/**
 * Composable for click-and-drag shape creation.
 *
 * Pointerdown sets origin, pointermove updates preview,
 * pointerup finalizes (or discards if below MIN_SHAPE_SIZE).
 * Shift constrains rect→square, ellipse→circle.
 */
export function useShapeCreation(
  annotationState: AnnotationStoreState,
  undoRedo: UndoRedoInstance,
): ShapeCreationResult {
  const store = useAnnotationStore(annotationState)

  const preview = shallowRef<ShapeCreationPreview | null>(null)
  const isDragging = ref(false)

  let originX = 0
  let originY = 0
  let currentType: ShapeType = "rect"
  let currentOptions: ShapeCreationOptions = {
    strokeColor: "#D14D41",
    strokeWidth: 2,
  }

  function onPointerDown(
    e: PointerEvent,
    shapeType: ShapeType,
    options: ShapeCreationOptions,
  ): void {
    originX = e.offsetX
    originY = e.offsetY
    currentType = shapeType
    currentOptions = options
    isDragging.value = true

    preview.value = {
      type: shapeType,
      x: originX,
      y: originY,
      width: 0,
      height: 0,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      fill: options.fill ?? false,
      fillColor: options.fillColor ?? "#000000",
      fillOpacity: options.fillOpacity ?? 1,
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging.value) return

    const currentX = e.offsetX
    const currentY = e.offsetY

    let width = Math.abs(currentX - originX)
    let height = Math.abs(currentY - originY)

    // Shift constrains to square/circle
    if (e.shiftKey) {
      const size = Math.max(width, height)
      width = size
      height = size
    }

    // Top-left corner (support drag in any direction)
    const x = currentX >= originX ? originX : originX - width
    const y = currentY >= originY ? originY : originY - height

    preview.value = {
      type: currentType,
      x,
      y,
      width,
      height,
      strokeColor: currentOptions.strokeColor,
      strokeWidth: currentOptions.strokeWidth,
      fill: currentOptions.fill ?? false,
      fillColor: currentOptions.fillColor ?? "#000000",
      fillOpacity: currentOptions.fillOpacity ?? 1,
    }
  }

  function onPointerUp(_e: PointerEvent): void {
    if (!isDragging.value || !preview.value) {
      cancel()
      return
    }

    const p = preview.value

    // Discard shapes below minimum size
    if (p.width < MIN_SHAPE_SIZE || p.height < MIN_SHAPE_SIZE) {
      cancel()
      return
    }

    const id = crypto.randomUUID()

    const annotation: Annotation =
      p.type === "rect"
        ? ({
            id,
            type: "rect",
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            rotation: 0,
            strokeColor: p.strokeColor,
            strokeWidth: p.strokeWidth,
            selected: false,
            fill: p.fill,
            fillColor: p.fillColor,
            fillOpacity: p.fillOpacity,
          } satisfies RectAnnotation)
        : ({
            id,
            type: "ellipse",
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            rotation: 0,
            strokeColor: p.strokeColor,
            strokeWidth: p.strokeWidth,
            selected: false,
            fill: p.fill,
            fillColor: p.fillColor,
            fillOpacity: p.fillOpacity,
          } satisfies EllipseAnnotation)

    const cmd = createSvgCreateCommand(
      annotation,
      store.addAnnotation,
      (aid: string) => {
        store.removeAnnotation(aid)
      },
    )
    undoRedo.push(cmd)

    cancel()
  }

  function cancel(): void {
    isDragging.value = false
    preview.value = null
  }

  return {
    preview,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    cancel,
  }
}

/**
 * Build an annotation from shape creation parameters.
 * Exported for testing — same logic as onPointerUp uses internally.
 */
export function buildShapeAnnotation(
  type: ShapeType,
  x: number,
  y: number,
  width: number,
  height: number,
  options: ShapeCreationOptions,
): RectAnnotation | EllipseAnnotation {
  const base = {
    id: crypto.randomUUID(),
    x,
    y,
    width,
    height,
    rotation: 0,
    strokeColor: options.strokeColor,
    strokeWidth: options.strokeWidth,
    selected: false,
    fill: options.fill ?? false,
    fillColor: options.fillColor ?? "#000000",
    fillOpacity: options.fillOpacity ?? 1,
  }

  return type === "rect"
    ? ({ ...base, type: "rect" } satisfies RectAnnotation)
    : ({ ...base, type: "ellipse" } satisfies EllipseAnnotation)
}

export { MIN_SHAPE_SIZE }
