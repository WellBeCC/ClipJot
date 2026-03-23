import { describe, test, expect, beforeEach } from "bun:test"
import { createUndoRedo } from "../../src/composables/useUndoRedo"
import {
  createAnnotationState,
  useAnnotationStore,
} from "../../src/composables/useAnnotationStore"
import {
  createRedactionState,
  useRedactionStore,
} from "../../src/composables/useRedaction"
import { createDrawingState } from "../../src/composables/useDrawing"
import { createCropState } from "../../src/composables/useCrop"
import { createSvgCreateCommand } from "../../src/commands/SvgCreateCommand"
import { createFreehandStrokeCommand } from "../../src/commands/FreehandStrokeCommand"
import { createCropCommand } from "../../src/commands/CropCommand"
import { createRedactionCreateCommand } from "../../src/commands/RedactionCreateCommand"
import { createRedactionMutateCommand } from "../../src/commands/RedactionMutateCommand"
import { createSvgMutateCommand } from "../../src/commands/SvgMutateCommand"
import { createSvgDeleteCommand } from "../../src/commands/SvgDeleteCommand"
import type { RectAnnotation } from "../../src/types/annotations"
import type { FreehandStroke } from "../../src/types/freehand"
import type { RedactionRegion } from "../../src/types/redaction"
import {
  PIXELATE_BLOCK_SIZES,
  BLUR_RADII,
  SOLID_DEFAULT_COLOR,
} from "../../src/types/redaction"

function makeStroke(overrides?: Partial<FreehandStroke>): FreehandStroke {
  return {
    id: crypto.randomUUID(),
    points: [
      [0, 0, 0.5],
      [10, 10, 0.5],
      [20, 20, 0.5],
    ],
    options: { size: 8 },
    color: "#ff0000",
    opacity: 1,
    compositeOperation: "source-over",
    ...overrides,
  }
}

function makeRect(overrides?: Partial<RectAnnotation>): RectAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "rect",
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    rotation: 0,
    strokeColor: "#ff0000",
    strokeWidth: 2,
    selected: false,
    fill: false,
    fillColor: "#000000",
    fillOpacity: 1,
    ...overrides,
  }
}

function makeRegion(
  overrides?: Partial<RedactionRegion>,
): RedactionRegion {
  return {
    id: crypto.randomUUID(),
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    style: "solid",
    solidColor: SOLID_DEFAULT_COLOR,
    blockSize: PIXELATE_BLOCK_SIZES[2],
    blurRadius: BLUR_RADII[2],
    ...overrides,
  }
}

describe("Undo/redo across all layer types", () => {
  let undoRedo: ReturnType<typeof createUndoRedo>
  let drawingState: ReturnType<typeof createDrawingState>
  let annotationState: ReturnType<typeof createAnnotationState>
  let annotationStore: ReturnType<typeof useAnnotationStore>
  let cropState: ReturnType<typeof createCropState>
  let redactionState: ReturnType<typeof createRedactionState>
  let redactionStore: ReturnType<typeof useRedactionStore>
  let redrawCalls: number

  beforeEach(() => {
    undoRedo = createUndoRedo()
    drawingState = createDrawingState()
    annotationState = createAnnotationState()
    annotationStore = useAnnotationStore(annotationState)
    cropState = createCropState()
    redactionState = createRedactionState()
    redactionStore = useRedactionStore(redactionState)
    redrawCalls = 0
  })

  function redrawFn(): void {
    redrawCalls++
  }

  describe("freehand → SVG → crop: undo 3x, redo 3x", () => {
    test("push 3 commands across layers, undo all, redo all", () => {
      const stroke = makeStroke()
      const rect = makeRect()

      // 1. Push freehand stroke
      undoRedo.push(
        createFreehandStrokeCommand(stroke, drawingState.strokes, redrawFn),
      )
      expect(drawingState.strokes.value).toHaveLength(1)

      // 2. Push SVG create
      undoRedo.push(
        createSvgCreateCommand(
          rect,
          annotationStore.addAnnotation,
          (id) => annotationStore.removeAnnotation(id),
        ),
      )
      expect(annotationStore.annotations.value).toHaveLength(1)

      // 3. Push crop
      undoRedo.push(
        createCropCommand(
          null,
          { x: 10, y: 10, width: 400, height: 300 },
          cropState.cropBounds,
        ),
      )
      expect(cropState.cropBounds.value).toEqual({
        x: 10,
        y: 10,
        width: 400,
        height: 300,
      })

      // Undo crop
      undoRedo.undo()
      expect(cropState.cropBounds.value).toBeNull()

      // Undo SVG
      undoRedo.undo()
      expect(annotationStore.annotations.value).toHaveLength(0)

      // Undo freehand
      undoRedo.undo()
      expect(drawingState.strokes.value).toHaveLength(0)

      // All undone
      expect(undoRedo.canUndo.value).toBe(false)
      expect(undoRedo.canRedo.value).toBe(true)

      // Redo freehand
      undoRedo.redo()
      expect(drawingState.strokes.value).toHaveLength(1)

      // Redo SVG
      undoRedo.redo()
      expect(annotationStore.annotations.value).toHaveLength(1)

      // Redo crop
      undoRedo.redo()
      expect(cropState.cropBounds.value).toEqual({
        x: 10,
        y: 10,
        width: 400,
        height: 300,
      })

      // All redone
      expect(undoRedo.canRedo.value).toBe(false)
      expect(undoRedo.canUndo.value).toBe(true)
    })
  })

  describe("push after undo truncates redo branch", () => {
    test("new command after partial undo clears redo history", () => {
      const stroke1 = makeStroke()
      const rect = makeRect()
      const stroke2 = makeStroke()

      // Push 3 commands
      undoRedo.push(
        createFreehandStrokeCommand(stroke1, drawingState.strokes, redrawFn),
      )
      undoRedo.push(
        createSvgCreateCommand(
          rect,
          annotationStore.addAnnotation,
          (id) => annotationStore.removeAnnotation(id),
        ),
      )
      undoRedo.push(
        createCropCommand(
          null,
          { x: 0, y: 0, width: 200, height: 200 },
          cropState.cropBounds,
        ),
      )

      // Undo 2 (back to just stroke1)
      undoRedo.undo() // undo crop
      undoRedo.undo() // undo SVG

      expect(undoRedo.canRedo.value).toBe(true)
      expect(undoRedo.commands.value).toHaveLength(3)

      // Push new command → truncates redo branch
      undoRedo.push(
        createFreehandStrokeCommand(stroke2, drawingState.strokes, redrawFn),
      )

      expect(undoRedo.commands.value).toHaveLength(2) // stroke1, stroke2
      expect(undoRedo.canRedo.value).toBe(false)

      // The SVG rect should have been removed by the undo
      expect(annotationStore.annotations.value).toHaveLength(0)

      // Both strokes should be present
      expect(drawingState.strokes.value).toHaveLength(2)
    })
  })

  describe("savedAtIndex tracks correctly across mixed commands", () => {
    test("markSaved then push changes isEdited", () => {
      const stroke = makeStroke()
      undoRedo.push(
        createFreehandStrokeCommand(stroke, drawingState.strokes, redrawFn),
      )

      undoRedo.markSaved()
      expect(undoRedo.isEdited.value).toBe(false)

      const rect = makeRect()
      undoRedo.push(
        createSvgCreateCommand(
          rect,
          annotationStore.addAnnotation,
          (id) => annotationStore.removeAnnotation(id),
        ),
      )
      expect(undoRedo.isEdited.value).toBe(true)
    })

    test("undo back to saved point makes isEdited false", () => {
      const stroke = makeStroke()
      const rect = makeRect()

      undoRedo.push(
        createFreehandStrokeCommand(stroke, drawingState.strokes, redrawFn),
      )
      undoRedo.markSaved()

      undoRedo.push(
        createSvgCreateCommand(
          rect,
          annotationStore.addAnnotation,
          (id) => annotationStore.removeAnnotation(id),
        ),
      )
      expect(undoRedo.isEdited.value).toBe(true)

      undoRedo.undo()
      expect(undoRedo.isEdited.value).toBe(false)
    })

    test("redo past saved point makes isEdited true again", () => {
      const stroke = makeStroke()
      const rect = makeRect()

      undoRedo.push(
        createFreehandStrokeCommand(stroke, drawingState.strokes, redrawFn),
      )
      undoRedo.markSaved()

      undoRedo.push(
        createSvgCreateCommand(
          rect,
          annotationStore.addAnnotation,
          (id) => annotationStore.removeAnnotation(id),
        ),
      )
      undoRedo.undo()
      expect(undoRedo.isEdited.value).toBe(false)

      undoRedo.redo()
      expect(undoRedo.isEdited.value).toBe(true)
    })

    test("savedAtIndex adjusts on depth prune", () => {
      const smallStack = createUndoRedo(3)
      const ds = createDrawingState()
      let calls = 0
      const rf = () => { calls++ }

      smallStack.push(
        createFreehandStrokeCommand(makeStroke(), ds.strokes, rf),
      )
      smallStack.push(
        createFreehandStrokeCommand(makeStroke(), ds.strokes, rf),
      )
      smallStack.markSaved() // saved at cursor=1

      smallStack.push(
        createFreehandStrokeCommand(makeStroke(), ds.strokes, rf),
      )
      // Still 3 commands, no prune yet
      expect(smallStack.commands.value).toHaveLength(3)

      smallStack.push(
        createFreehandStrokeCommand(makeStroke(), ds.strokes, rf),
      )
      // Pruned: now 3 commands, oldest removed
      expect(smallStack.commands.value).toHaveLength(3)
      // savedAtIndex was 1, now decremented to 0 after prune
      expect(smallStack.isEdited.value).toBe(true) // cursor (2) !== savedAt (0)
    })
  })

  describe("isEdited correctly computed", () => {
    test("initially not edited", () => {
      expect(undoRedo.isEdited.value).toBe(false)
    })

    test("edited after any push", () => {
      undoRedo.push(
        createCropCommand(
          null,
          { x: 0, y: 0, width: 100, height: 100 },
          cropState.cropBounds,
        ),
      )
      expect(undoRedo.isEdited.value).toBe(true)
    })

    test("not edited after push + markSaved", () => {
      undoRedo.push(
        createCropCommand(
          null,
          { x: 0, y: 0, width: 100, height: 100 },
          cropState.cropBounds,
        ),
      )
      undoRedo.markSaved()
      expect(undoRedo.isEdited.value).toBe(false)
    })

    test("edited after push + markSaved + undo", () => {
      undoRedo.push(
        createCropCommand(
          null,
          { x: 0, y: 0, width: 100, height: 100 },
          cropState.cropBounds,
        ),
      )
      undoRedo.markSaved()
      undoRedo.undo()
      expect(undoRedo.isEdited.value).toBe(true)
    })

    test("not edited after push + markSaved + undo + redo", () => {
      undoRedo.push(
        createCropCommand(
          null,
          { x: 0, y: 0, width: 100, height: 100 },
          cropState.cropBounds,
        ),
      )
      undoRedo.markSaved()
      undoRedo.undo()
      undoRedo.redo()
      expect(undoRedo.isEdited.value).toBe(false)
    })
  })

  describe("all four layer types in one stack", () => {
    test("freehand + SVG + redaction + crop interleaved", () => {
      const stroke = makeStroke()
      const rect = makeRect()
      const region = makeRegion()

      // Freehand
      undoRedo.push(
        createFreehandStrokeCommand(stroke, drawingState.strokes, redrawFn),
      )
      // SVG
      undoRedo.push(
        createSvgCreateCommand(
          rect,
          annotationStore.addAnnotation,
          (id) => annotationStore.removeAnnotation(id),
        ),
      )
      // Redaction
      undoRedo.push(
        createRedactionCreateCommand(
          region,
          redactionStore.addRegion,
          (id) => redactionStore.removeRegion(id),
        ),
      )
      // Crop
      undoRedo.push(
        createCropCommand(
          null,
          { x: 5, y: 5, width: 300, height: 250 },
          cropState.cropBounds,
        ),
      )

      // Verify all 4 layers have state
      expect(drawingState.strokes.value).toHaveLength(1)
      expect(annotationStore.annotations.value).toHaveLength(1)
      expect(redactionStore.regions.value).toHaveLength(1)
      expect(cropState.cropBounds.value).not.toBeNull()

      // Undo all 4
      undoRedo.undo()
      undoRedo.undo()
      undoRedo.undo()
      undoRedo.undo()

      // All empty
      expect(drawingState.strokes.value).toHaveLength(0)
      expect(annotationStore.annotations.value).toHaveLength(0)
      expect(redactionStore.regions.value).toHaveLength(0)
      expect(cropState.cropBounds.value).toBeNull()

      // Redo all 4
      undoRedo.redo()
      undoRedo.redo()
      undoRedo.redo()
      undoRedo.redo()

      // All restored
      expect(drawingState.strokes.value).toHaveLength(1)
      expect(annotationStore.annotations.value).toHaveLength(1)
      expect(redactionStore.regions.value).toHaveLength(1)
      expect(cropState.cropBounds.value).toEqual({
        x: 5,
        y: 5,
        width: 300,
        height: 250,
      })
    })
  })

  describe("command layer labels are correct", () => {
    test("freehand command has layer 'freehand'", () => {
      const stroke = makeStroke()
      const cmd = createFreehandStrokeCommand(
        stroke,
        drawingState.strokes,
        redrawFn,
      )
      expect(cmd.layer).toBe("freehand")
    })

    test("SVG command has layer 'svg'", () => {
      const rect = makeRect()
      const cmd = createSvgCreateCommand(
        rect,
        annotationStore.addAnnotation,
        (id) => annotationStore.removeAnnotation(id),
      )
      expect(cmd.layer).toBe("svg")
    })

    test("redaction command has layer 'redaction'", () => {
      const region = makeRegion()
      const cmd = createRedactionCreateCommand(
        region,
        redactionStore.addRegion,
        (id) => redactionStore.removeRegion(id),
      )
      expect(cmd.layer).toBe("redaction")
    })

    test("crop command has layer 'crop'", () => {
      const cmd = createCropCommand(
        null,
        { x: 0, y: 0, width: 100, height: 100 },
        cropState.cropBounds,
      )
      expect(cmd.layer).toBe("crop")
    })
  })

  describe("complex undo/redo scenarios", () => {
    test("interleaved mutate and delete with undo/redo", () => {
      const rect = makeRect({ strokeColor: "#ff0000" })

      // Create rect
      undoRedo.push(
        createSvgCreateCommand(
          rect,
          annotationStore.addAnnotation,
          (id) => annotationStore.removeAnnotation(id),
        ),
      )

      // Mutate it
      undoRedo.push(
        createSvgMutateCommand(
          rect.id,
          { strokeColor: "#ff0000" },
          { strokeColor: "#00ff00" },
          annotationStore.updateAnnotation,
        ),
      )
      expect(annotationStore.annotations.value[0].strokeColor).toBe("#00ff00")

      // Add a redaction region
      const region = makeRegion()
      undoRedo.push(
        createRedactionCreateCommand(
          region,
          redactionStore.addRegion,
          (id) => redactionStore.removeRegion(id),
        ),
      )

      // Delete the rect
      undoRedo.push(
        createSvgDeleteCommand(
          { ...annotationStore.annotations.value[0] },
          0,
          (id) => annotationStore.removeAnnotation(id),
          annotationStore.insertAnnotation,
        ),
      )
      expect(annotationStore.annotations.value).toHaveLength(0)
      expect(redactionStore.regions.value).toHaveLength(1)

      // Undo delete → rect back with green stroke
      undoRedo.undo()
      expect(annotationStore.annotations.value).toHaveLength(1)
      expect(annotationStore.annotations.value[0].strokeColor).toBe("#00ff00")

      // Undo redaction create
      undoRedo.undo()
      expect(redactionStore.regions.value).toHaveLength(0)

      // Undo mutate → rect back to red
      undoRedo.undo()
      expect(annotationStore.annotations.value[0].strokeColor).toBe("#ff0000")

      // Undo create → no annotations
      undoRedo.undo()
      expect(annotationStore.annotations.value).toHaveLength(0)
    })

    test("redaction mutate + undo preserves original values", () => {
      const region = makeRegion({ style: "pixelate", blockSize: 16 })

      undoRedo.push(
        createRedactionCreateCommand(
          region,
          redactionStore.addRegion,
          (id) => redactionStore.removeRegion(id),
        ),
      )

      undoRedo.push(
        createRedactionMutateCommand(
          region.id,
          { blockSize: 16 },
          { blockSize: 24 },
          redactionStore.updateRegion,
        ),
      )
      expect(redactionStore.regions.value[0].blockSize).toBe(24)

      undoRedo.push(
        createRedactionMutateCommand(
          region.id,
          { blockSize: 24 },
          { blockSize: 32 },
          redactionStore.updateRegion,
        ),
      )
      expect(redactionStore.regions.value[0].blockSize).toBe(32)

      // Undo twice back to original
      undoRedo.undo()
      expect(redactionStore.regions.value[0].blockSize).toBe(24)
      undoRedo.undo()
      expect(redactionStore.regions.value[0].blockSize).toBe(16)
    })
  })
})
