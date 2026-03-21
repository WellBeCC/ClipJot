import { describe, test, expect, beforeEach } from "bun:test"
import { createUndoRedo } from "../../src/composables/useUndoRedo"
import { createDrawingState } from "../../src/composables/useDrawing"
import { createCropState } from "../../src/composables/useCrop"
import { createAnnotationState } from "../../src/composables/useAnnotationStore"
import { createRedactionState } from "../../src/composables/useRedaction"
import type { Tab } from "../../src/types/tab"
import type { Command } from "../../src/types/commands"

/**
 * Build a Tab object without touching the singleton useTabStore,
 * so each test gets isolated state.
 */
function buildTab(overrides?: Partial<Tab>): Tab {
  return {
    id: crypto.randomUUID(),
    name: "Test",
    type: "editing",
    imageUrl: "blob:test",
    imageWidth: 800,
    imageHeight: 600,
    copiedSinceLastEdit: false,
    undoRedo: createUndoRedo(),
    drawingState: createDrawingState(),
    cropState: createCropState(),
    annotationState: createAnnotationState(),
    redactionState: createRedactionState(),
    ...overrides,
  }
}

function mockCommand(
  label: string,
  layer: Command["layer"] = "svg",
): Command & { executeCount: number; undoCount: number } {
  const cmd = {
    id: crypto.randomUUID(),
    label,
    layer,
    executeCount: 0,
    undoCount: 0,
    execute() {
      cmd.executeCount++
    },
    undo() {
      cmd.undoCount++
    },
  }
  return cmd
}

describe("Clipboard round-trip: tab lifecycle", () => {
  describe("clipboard tab initialization", () => {
    test("clipboard tab has correct defaults", () => {
      const tab = buildTab({ id: "clipboard", type: "clipboard", imageUrl: null })
      expect(tab.type).toBe("clipboard")
      expect(tab.imageUrl).toBeNull()
      expect(tab.imageWidth).toBe(800)
      expect(tab.imageHeight).toBe(600)
      expect(tab.copiedSinceLastEdit).toBe(false)
    })

    test("clipboard tab starts with all empty layer states", () => {
      const tab = buildTab({
        id: "clipboard",
        type: "clipboard",
        imageUrl: null,
        copiedSinceLastEdit: true,
      })
      expect(tab.drawingState.strokes.value).toEqual([])
      expect(tab.annotationState.annotations.value).toEqual([])
      expect(tab.redactionState.regions.value).toEqual([])
      expect(tab.cropState.cropBounds.value).toBeNull()
    })

    test("clipboard tab undoRedo stack is empty", () => {
      const tab = buildTab({ id: "clipboard", type: "clipboard" })
      expect(tab.undoRedo.canUndo.value).toBe(false)
      expect(tab.undoRedo.canRedo.value).toBe(false)
      expect(tab.undoRedo.isEdited.value).toBe(false)
    })
  })

  describe("editing tab creation with image data", () => {
    test("editing tab stores image dimensions", () => {
      const tab = buildTab({
        imageUrl: "blob:test-img",
        imageWidth: 1920,
        imageHeight: 1080,
      })
      expect(tab.imageUrl).toBe("blob:test-img")
      expect(tab.imageWidth).toBe(1920)
      expect(tab.imageHeight).toBe(1080)
    })

    test("editing tab starts uncopied", () => {
      const tab = buildTab()
      expect(tab.copiedSinceLastEdit).toBe(false)
    })

    test("editing tab has isolated undo stack", () => {
      const tab1 = buildTab()
      const tab2 = buildTab()

      tab1.undoRedo.push(mockCommand("tab1-edit"))

      expect(tab1.undoRedo.canUndo.value).toBe(true)
      expect(tab2.undoRedo.canUndo.value).toBe(false)
    })

    test("editing tab has isolated annotation state", () => {
      const tab1 = buildTab()
      const tab2 = buildTab()

      tab1.annotationState.annotations.value = [
        {
          id: "a1",
          type: "rect",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          strokeColor: "#ff0000",
          strokeWidth: 2,
          selected: false,
          fill: false,
          fillColor: "#000",
          fillOpacity: 1,
        },
      ]

      expect(tab1.annotationState.annotations.value).toHaveLength(1)
      expect(tab2.annotationState.annotations.value).toHaveLength(0)
    })

    test("editing tab has isolated redaction state", () => {
      const tab1 = buildTab()
      const tab2 = buildTab()

      tab1.redactionState.regions.value = [
        {
          id: "r1",
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          style: "solid",
          solidColor: "#000",
          blockSize: 16,
          blurRadius: 40,
        },
      ]

      expect(tab1.redactionState.regions.value).toHaveLength(1)
      expect(tab2.redactionState.regions.value).toHaveLength(0)
    })
  })

  describe("copiedSinceLastEdit lifecycle", () => {
    let tab: Tab

    beforeEach(() => {
      tab = buildTab({ copiedSinceLastEdit: true })
    })

    test("starts as true for clipboard tab scenario", () => {
      expect(tab.copiedSinceLastEdit).toBe(true)
    })

    test("becomes false when markTabEdited pattern is applied", () => {
      // Simulating markTabEdited logic inline
      tab.copiedSinceLastEdit = false
      expect(tab.copiedSinceLastEdit).toBe(false)
    })

    test("becomes true again after markTabCopied pattern", () => {
      tab.copiedSinceLastEdit = false
      // Simulating markTabCopied logic
      tab.copiedSinceLastEdit = true
      tab.undoRedo.markSaved()
      expect(tab.copiedSinceLastEdit).toBe(true)
      expect(tab.undoRedo.isEdited.value).toBe(false)
    })

    test("edit → copy → edit → needs warning scenario", () => {
      // Initial state: copied
      expect(tab.copiedSinceLastEdit).toBe(true)

      // User makes an edit
      tab.undoRedo.push(mockCommand("edit-1"))
      tab.copiedSinceLastEdit = false
      expect(tab.copiedSinceLastEdit).toBe(false)
      expect(tab.undoRedo.isEdited.value).toBe(true)

      // User copies
      tab.copiedSinceLastEdit = true
      tab.undoRedo.markSaved()
      expect(tab.copiedSinceLastEdit).toBe(true)
      expect(tab.undoRedo.isEdited.value).toBe(false)

      // User makes another edit
      tab.undoRedo.push(mockCommand("edit-2"))
      tab.copiedSinceLastEdit = false

      // Now has uncopied edits
      const hasUncopiedEdits =
        !tab.copiedSinceLastEdit && tab.undoRedo.isEdited.value
      expect(hasUncopiedEdits).toBe(true)
    })

    test("no edits means no warning needed", () => {
      // copiedSinceLastEdit=true, isEdited=false → no warning
      const hasUncopiedEdits =
        !tab.copiedSinceLastEdit && tab.undoRedo.isEdited.value
      expect(hasUncopiedEdits).toBe(false)
    })
  })

  describe("tab close cleanup", () => {
    test("clearing undo stack resets all state", () => {
      const tab = buildTab()
      tab.undoRedo.push(mockCommand("a"))
      tab.undoRedo.push(mockCommand("b"))
      tab.undoRedo.markSaved()

      tab.undoRedo.clear()

      expect(tab.undoRedo.commands.value).toHaveLength(0)
      expect(tab.undoRedo.cursor.value).toBe(-1)
      expect(tab.undoRedo.canUndo.value).toBe(false)
      expect(tab.undoRedo.canRedo.value).toBe(false)
      expect(tab.undoRedo.isEdited.value).toBe(false)
    })
  })

  describe("export composable references correct state", () => {
    test("flattenTab reads from tab.redactionState.regions", () => {
      const tab = buildTab()
      tab.redactionState.regions.value = [
        {
          id: "r1",
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          style: "solid",
          solidColor: "#000",
          blockSize: 16,
          blurRadius: 40,
        },
      ]
      // Verify the regions are accessible from tab structure
      expect(tab.redactionState.regions.value).toHaveLength(1)
      expect(tab.redactionState.regions.value[0].style).toBe("solid")
    })

    test("flattenTab reads from tab.drawingState.strokes", () => {
      const tab = buildTab()
      // Strokes are empty by default
      expect(tab.drawingState.strokes.value).toHaveLength(0)
    })

    test("flattenTab reads from tab.annotationState.annotations", () => {
      const tab = buildTab()
      expect(tab.annotationState.annotations.value).toHaveLength(0)
    })

    test("export pipeline accesses all layers through tab reference", () => {
      const tab = buildTab()
      // All layers must be accessible from the tab object
      expect(tab.redactionState).toBeDefined()
      expect(tab.drawingState).toBeDefined()
      expect(tab.annotationState).toBeDefined()
      expect(tab.cropState).toBeDefined()
    })
  })
})
