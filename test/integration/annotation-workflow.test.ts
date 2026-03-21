import { describe, test, expect, beforeEach } from "bun:test"
import type {
  Annotation,
  RectAnnotation,
  EllipseAnnotation,
  ArrowAnnotation,
  CalloutAnnotation,
} from "../../src/types/annotations"
import { getAnnotationBounds } from "../../src/types/annotations"
import {
  createAnnotationState,
  useAnnotationStore,
} from "../../src/composables/useAnnotationStore"
import type { AnnotationStoreState } from "../../src/composables/useAnnotationStore"
import { useSelection } from "../../src/composables/useSelection"
import { createSvgCreateCommand } from "../../src/commands/SvgCreateCommand"
import { createSvgMutateCommand } from "../../src/commands/SvgMutateCommand"
import { createSvgDeleteCommand } from "../../src/commands/SvgDeleteCommand"
import { createCalloutDeleteCommand } from "../../src/commands/CalloutDeleteCommand"
import { createUndoRedo } from "../../src/composables/useUndoRedo"

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

function makeEllipse(
  overrides?: Partial<EllipseAnnotation>,
): EllipseAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "ellipse",
    x: 30,
    y: 40,
    width: 80,
    height: 60,
    rotation: 0,
    strokeColor: "#00ff00",
    strokeWidth: 1,
    selected: false,
    fill: false,
    fillColor: "#000000",
    fillOpacity: 1,
    ...overrides,
  }
}

function makeArrow(overrides?: Partial<ArrowAnnotation>): ArrowAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "arrow",
    x: 0,
    y: 0,
    endX: 100,
    endY: 200,
    controlX: 0,
    controlY: 0,
    rotation: 0,
    strokeColor: "#0000ff",
    strokeWidth: 2,
    selected: false,
    ...overrides,
  }
}

function makeCallout(
  overrides?: Partial<CalloutAnnotation>,
): CalloutAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "callout",
    x: 100,
    y: 100,
    number: 1,
    radius: 16,
    fillColor: "#ff0000",
    rotation: 0,
    strokeColor: "#ffffff",
    strokeWidth: 2,
    selected: false,
    ...overrides,
  }
}

describe("Annotation workflow: CRUD across types", () => {
  let state: AnnotationStoreState
  let store: ReturnType<typeof useAnnotationStore>
  let undoRedo: ReturnType<typeof createUndoRedo>

  beforeEach(() => {
    state = createAnnotationState()
    store = useAnnotationStore(state)
    undoRedo = createUndoRedo()
  })

  describe("create multiple annotation types via commands", () => {
    test("create rect, ellipse, arrow, callout through undo stack", () => {
      const rect = makeRect()
      const ellipse = makeEllipse()
      const arrow = makeArrow()
      const callout = makeCallout({ number: store.getNextCalloutNumber() })

      undoRedo.push(
        createSvgCreateCommand(
          rect,
          store.addAnnotation,
          (id) => store.removeAnnotation(id),
        ),
      )
      undoRedo.push(
        createSvgCreateCommand(
          ellipse,
          store.addAnnotation,
          (id) => store.removeAnnotation(id),
        ),
      )
      undoRedo.push(
        createSvgCreateCommand(
          arrow,
          store.addAnnotation,
          (id) => store.removeAnnotation(id),
        ),
      )
      undoRedo.push(
        createSvgCreateCommand(
          callout,
          store.addAnnotation,
          (id) => store.removeAnnotation(id),
        ),
      )

      expect(store.annotations.value).toHaveLength(4)
      expect(store.annotations.value[0].type).toBe("rect")
      expect(store.annotations.value[1].type).toBe("ellipse")
      expect(store.annotations.value[2].type).toBe("arrow")
      expect(store.annotations.value[3].type).toBe("callout")
    })

    test("each annotation has unique id", () => {
      const annotations: Annotation[] = [
        makeRect(),
        makeEllipse(),
        makeArrow(),
        makeCallout(),
      ]
      for (const a of annotations) {
        undoRedo.push(
          createSvgCreateCommand(
            a,
            store.addAnnotation,
            (id) => store.removeAnnotation(id),
          ),
        )
      }

      const ids = store.annotations.value.map((a) => a.id)
      expect(new Set(ids).size).toBe(4)
    })
  })

  describe("mutate annotations via SvgMutateCommand", () => {
    test("mutate rect stroke color and undo restores it", () => {
      const rect = makeRect({ strokeColor: "#ff0000" })
      undoRedo.push(
        createSvgCreateCommand(
          rect,
          store.addAnnotation,
          (id) => store.removeAnnotation(id),
        ),
      )

      undoRedo.push(
        createSvgMutateCommand(
          rect.id,
          { strokeColor: "#ff0000" },
          { strokeColor: "#00ff00" },
          store.updateAnnotation,
        ),
      )

      expect(store.annotations.value[0].strokeColor).toBe("#00ff00")

      undoRedo.undo()
      expect(store.annotations.value[0].strokeColor).toBe("#ff0000")

      undoRedo.redo()
      expect(store.annotations.value[0].strokeColor).toBe("#00ff00")
    })

    test("mutate ellipse dimensions", () => {
      const ellipse = makeEllipse({ width: 80, height: 60 })
      undoRedo.push(
        createSvgCreateCommand(
          ellipse,
          store.addAnnotation,
          (id) => store.removeAnnotation(id),
        ),
      )

      undoRedo.push(
        createSvgMutateCommand(
          ellipse.id,
          { width: 80, height: 60 },
          { width: 120, height: 90 },
          store.updateAnnotation,
        ),
      )

      const updated = store.annotations.value[0] as EllipseAnnotation
      expect(updated.width).toBe(120)
      expect(updated.height).toBe(90)
    })

    test("mutate arrow endpoint", () => {
      const arrow = makeArrow({ endX: 100, endY: 200 })
      undoRedo.push(
        createSvgCreateCommand(
          arrow,
          store.addAnnotation,
          (id) => store.removeAnnotation(id),
        ),
      )

      undoRedo.push(
        createSvgMutateCommand(
          arrow.id,
          { endX: 100, endY: 200 },
          { endX: 300, endY: 400 },
          store.updateAnnotation,
        ),
      )

      const updated = store.annotations.value[0] as ArrowAnnotation
      expect(updated.endX).toBe(300)
      expect(updated.endY).toBe(400)
    })
  })

  describe("delete annotations via SvgDeleteCommand", () => {
    test("delete middle annotation preserves order of remaining", () => {
      const rect = makeRect()
      const ellipse = makeEllipse()
      const arrow = makeArrow()

      for (const a of [rect, ellipse, arrow]) {
        undoRedo.push(
          createSvgCreateCommand(
            a,
            store.addAnnotation,
            (id) => store.removeAnnotation(id),
          ),
        )
      }

      const deleteCmd = createSvgDeleteCommand(
        ellipse,
        1,
        (id) => store.removeAnnotation(id),
        store.insertAnnotation,
      )
      undoRedo.push(deleteCmd)

      expect(store.annotations.value).toHaveLength(2)
      expect(store.annotations.value[0].type).toBe("rect")
      expect(store.annotations.value[1].type).toBe("arrow")
    })

    test("undo delete restores at original index", () => {
      const rect = makeRect()
      const ellipse = makeEllipse()
      const arrow = makeArrow()

      for (const a of [rect, ellipse, arrow]) {
        undoRedo.push(
          createSvgCreateCommand(
            a,
            store.addAnnotation,
            (id) => store.removeAnnotation(id),
          ),
        )
      }

      const deleteCmd = createSvgDeleteCommand(
        ellipse,
        1,
        (id) => store.removeAnnotation(id),
        store.insertAnnotation,
      )
      undoRedo.push(deleteCmd)
      undoRedo.undo()

      expect(store.annotations.value).toHaveLength(3)
      expect(store.annotations.value[1].id).toBe(ellipse.id)
    })
  })

  describe("callout auto-renumber on delete + undo restores numbers", () => {
    test("delete callout #2 of (1,2,3) renumbers to (1,2) then undo restores (1,2,3)", () => {
      const c1 = makeCallout({ number: 1 })
      const c2 = makeCallout({ number: 2 })
      const c3 = makeCallout({ number: 3 })

      for (const c of [c1, c2, c3]) {
        undoRedo.push(
          createSvgCreateCommand(
            c,
            store.addAnnotation,
            (id) => store.removeAnnotation(id),
          ),
        )
      }

      const deleteCmd = createCalloutDeleteCommand(
        c2,
        1,
        store.annotations.value,
        (id) => store.removeAnnotation(id),
        store.insertAnnotation,
        store.updateAnnotation,
      )
      undoRedo.push(deleteCmd)

      expect(store.annotations.value).toHaveLength(2)
      const numbersAfterDelete = store.annotations.value.map(
        (a) => (a as CalloutAnnotation).number,
      )
      expect(numbersAfterDelete).toEqual([1, 2])

      // Undo restores the deleted callout and original numbers
      undoRedo.undo()

      expect(store.annotations.value).toHaveLength(3)
      const numbersAfterUndo = store.annotations.value.map(
        (a) => (a as CalloutAnnotation).number,
      )
      expect(numbersAfterUndo).toEqual([1, 2, 3])
      expect(store.annotations.value[1].id).toBe(c2.id)
    })

    test("delete first callout renumbers correctly", () => {
      const c1 = makeCallout({ number: 1 })
      const c2 = makeCallout({ number: 2 })
      const c3 = makeCallout({ number: 3 })

      for (const c of [c1, c2, c3]) {
        store.addAnnotation(c)
      }

      const deleteCmd = createCalloutDeleteCommand(
        c1,
        0,
        store.annotations.value,
        (id) => store.removeAnnotation(id),
        store.insertAnnotation,
        store.updateAnnotation,
      )
      deleteCmd.execute()

      const numbers = store.annotations.value.map(
        (a) => (a as CalloutAnnotation).number,
      )
      expect(numbers).toEqual([1, 2])
    })
  })

  describe("getAnnotationBounds works for all types", () => {
    test("rect bounds", () => {
      const r = makeRect({ x: 10, y: 20, width: 100, height: 50 })
      expect(getAnnotationBounds(r)).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      })
    })

    test("ellipse bounds", () => {
      const e = makeEllipse({ x: 30, y: 40, width: 80, height: 60 })
      expect(getAnnotationBounds(e)).toEqual({
        x: 30,
        y: 40,
        width: 80,
        height: 60,
      })
    })

    test("arrow bounds compute min/max from endpoints", () => {
      const a = makeArrow({ x: 100, y: 200, endX: 50, endY: 100 })
      expect(getAnnotationBounds(a)).toEqual({
        x: 50,
        y: 100,
        width: 50,
        height: 100,
      })
    })

    test("callout bounds center on x,y with radius", () => {
      const c = makeCallout({ x: 100, y: 100, radius: 20 })
      expect(getAnnotationBounds(c)).toEqual({
        x: 80,
        y: 80,
        width: 40,
        height: 40,
      })
    })
  })
})

describe("Annotation workflow: selection system", () => {
  let selection: ReturnType<typeof useSelection>

  beforeEach(() => {
    selection = useSelection()
    selection.deselect()
  })

  test("select single annotation", () => {
    selection.select("ann-1")
    expect(selection.isSelected("ann-1")).toBe(true)
    expect(selection.selectedIds.value.size).toBe(1)
  })

  test("multi-select with additive mode", () => {
    selection.select("ann-1")
    selection.select("ann-2", true)
    selection.select("ann-3", true)

    expect(selection.selectedIds.value.size).toBe(3)
    expect(selection.isSelected("ann-1")).toBe(true)
    expect(selection.isSelected("ann-2")).toBe(true)
    expect(selection.isSelected("ann-3")).toBe(true)
  })

  test("additive toggle deselects already-selected", () => {
    selection.select("ann-1")
    selection.select("ann-2", true)
    selection.select("ann-1", true) // toggle off

    expect(selection.isSelected("ann-1")).toBe(false)
    expect(selection.isSelected("ann-2")).toBe(true)
    expect(selection.selectedIds.value.size).toBe(1)
  })

  test("non-additive select replaces multi-selection", () => {
    selection.select("ann-1")
    selection.select("ann-2", true)
    selection.select("ann-3", true)
    selection.select("ann-4") // non-additive

    expect(selection.selectedIds.value.size).toBe(1)
    expect(selection.isSelected("ann-4")).toBe(true)
    expect(selection.isSelected("ann-1")).toBe(false)
  })

  test("deselect clears everything", () => {
    selection.select("ann-1")
    selection.select("ann-2", true)
    selection.deselect()

    expect(selection.hasSelection.value).toBe(false)
    expect(selection.selectedIds.value.size).toBe(0)
  })

  test("create → select → mutate → deselect workflow", () => {
    const state = createAnnotationState()
    const store = useAnnotationStore(state)
    const undoRedo = createUndoRedo()

    // Create
    const rect = makeRect({ strokeColor: "#ff0000" })
    undoRedo.push(
      createSvgCreateCommand(
        rect,
        store.addAnnotation,
        (id) => store.removeAnnotation(id),
      ),
    )

    // Select
    selection.select(rect.id)
    expect(selection.isSelected(rect.id)).toBe(true)

    // Mutate
    undoRedo.push(
      createSvgMutateCommand(
        rect.id,
        { strokeColor: "#ff0000" },
        { strokeColor: "#00ff00" },
        store.updateAnnotation,
      ),
    )
    expect(store.annotations.value[0].strokeColor).toBe("#00ff00")

    // Deselect
    selection.deselect()
    expect(selection.hasSelection.value).toBe(false)

    // Annotation persists after deselect
    expect(store.annotations.value[0].strokeColor).toBe("#00ff00")
  })
})
