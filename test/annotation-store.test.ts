import { describe, test, expect, beforeEach } from "bun:test"
import type {
  Annotation,
  RectAnnotation,
  EllipseAnnotation,
  ArrowAnnotation,
  LineAnnotation,
  CalloutAnnotation,
  TextAnnotation,
} from "../src/types/annotations"
import { getAnnotationBounds, assertNever } from "../src/types/annotations"
import {
  createAnnotationState,
  useAnnotationStore,
} from "../src/composables/useAnnotationStore"
import type { AnnotationStoreState } from "../src/composables/useAnnotationStore"
import { createSvgCreateCommand } from "../src/commands/SvgCreateCommand"
import { createSvgMutateCommand } from "../src/commands/SvgMutateCommand"
import { createSvgDeleteCommand } from "../src/commands/SvgDeleteCommand"

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

function makeLine(overrides?: Partial<LineAnnotation>): LineAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "line",
    x: 50,
    y: 50,
    endX: 150,
    endY: 250,
    rotation: 0,
    strokeColor: "#ff00ff",
    strokeWidth: 1,
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

function makeText(overrides?: Partial<TextAnnotation>): TextAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "text",
    x: 200,
    y: 300,
    width: 150,
    height: 40,
    htmlContent: "<p>Hello</p>",
    fontFamily: "sans-serif",
    fontSize: 16,
    rotation: 0,
    strokeColor: "#000000",
    strokeWidth: 0,
    selected: false,
    fill: false,
    fillColor: "#ffffff",
    ...overrides,
  }
}

describe("Annotation types (discriminated union)", () => {
  test("rect annotation has type 'rect'", () => {
    const r = makeRect()
    expect(r.type).toBe("rect")
  })

  test("ellipse annotation has type 'ellipse'", () => {
    const e = makeEllipse()
    expect(e.type).toBe("ellipse")
  })

  test("arrow annotation has type 'arrow'", () => {
    const a = makeArrow()
    expect(a.type).toBe("arrow")
  })

  test("line annotation has type 'line'", () => {
    const l = makeLine()
    expect(l.type).toBe("line")
  })

  test("callout annotation has type 'callout'", () => {
    const c = makeCallout()
    expect(c.type).toBe("callout")
  })

  test("text annotation has type 'text'", () => {
    const t = makeText()
    expect(t.type).toBe("text")
  })

  test("discriminated union narrows correctly in switch", () => {
    // Use Annotation union so all cases are reachable
    const annotations: Annotation[] = [
      makeRect(),
      makeEllipse(),
      makeArrow(),
      makeLine(),
      makeCallout(),
      makeText(),
    ]
    for (const annotation of annotations) {
      switch (annotation.type) {
        case "rect":
          expect(annotation.width).toBeDefined()
          break
        case "ellipse":
          expect(annotation.width).toBeDefined()
          break
        case "arrow":
          expect(annotation.endX).toBeDefined()
          break
        case "line":
          expect(annotation.endX).toBeDefined()
          break
        case "callout":
          expect(annotation.radius).toBeDefined()
          break
        case "text":
          expect(annotation.htmlContent).toBeDefined()
          break
        default:
          assertNever(annotation)
      }
    }
  })
})

describe("getAnnotationBounds", () => {
  test("rect bounds are direct", () => {
    const r = makeRect({ x: 10, y: 20, width: 100, height: 50 })
    const bounds = getAnnotationBounds(r)
    expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 50 })
  })

  test("ellipse bounds are direct", () => {
    const e = makeEllipse({ x: 30, y: 40, width: 80, height: 60 })
    const bounds = getAnnotationBounds(e)
    expect(bounds).toEqual({ x: 30, y: 40, width: 80, height: 60 })
  })

  test("text bounds are direct", () => {
    const t = makeText({ x: 200, y: 300, width: 150, height: 40 })
    const bounds = getAnnotationBounds(t)
    expect(bounds).toEqual({ x: 200, y: 300, width: 150, height: 40 })
  })

  test("arrow bounds compute min/max", () => {
    const a = makeArrow({ x: 100, y: 200, endX: 50, endY: 100 })
    const bounds = getAnnotationBounds(a)
    expect(bounds).toEqual({ x: 50, y: 100, width: 50, height: 100 })
  })

  test("line bounds compute min/max", () => {
    const l = makeLine({ x: 50, y: 50, endX: 150, endY: 250 })
    const bounds = getAnnotationBounds(l)
    expect(bounds).toEqual({ x: 50, y: 50, width: 100, height: 200 })
  })

  test("callout bounds center on x,y with radius", () => {
    const c = makeCallout({ x: 100, y: 100, radius: 16 })
    const bounds = getAnnotationBounds(c)
    expect(bounds).toEqual({ x: 84, y: 84, width: 32, height: 32 })
  })
})

describe("assertNever", () => {
  test("throws on unexpected type", () => {
    const fake = { type: "unknown" } as never
    expect(() => assertNever(fake)).toThrow("Unexpected annotation type")
  })
})

describe("createAnnotationState", () => {
  test("returns state with empty annotations shallowRef", () => {
    const state = createAnnotationState()
    expect(state.annotations.value).toEqual([])
  })
})

describe("useAnnotationStore", () => {
  let state: AnnotationStoreState
  let store: ReturnType<typeof useAnnotationStore>

  beforeEach(() => {
    state = createAnnotationState()
    store = useAnnotationStore(state)
  })

  test("addAnnotation appends to array", () => {
    const r = makeRect()
    store.addAnnotation(r)
    expect(store.annotations.value).toHaveLength(1)
    expect(store.annotations.value[0].id).toBe(r.id)
  })

  test("removeAnnotation removes by id and returns it", () => {
    const r = makeRect()
    store.addAnnotation(r)
    const removed = store.removeAnnotation(r.id)
    expect(removed).toBeDefined()
    expect(removed!.id).toBe(r.id)
    expect(store.annotations.value).toHaveLength(0)
  })

  test("removeAnnotation returns undefined for missing id", () => {
    const removed = store.removeAnnotation("nonexistent")
    expect(removed).toBeUndefined()
  })

  test("updateAnnotation patches by id", () => {
    const r = makeRect({ strokeColor: "#ff0000" })
    store.addAnnotation(r)
    store.updateAnnotation(r.id, { strokeColor: "#00ff00" })
    expect(store.annotations.value[0].strokeColor).toBe("#00ff00")
  })

  test("updateAnnotation does not affect other annotations", () => {
    const r1 = makeRect({ strokeColor: "#ff0000" })
    const r2 = makeRect({ strokeColor: "#0000ff" })
    store.addAnnotation(r1)
    store.addAnnotation(r2)
    store.updateAnnotation(r1.id, { strokeColor: "#00ff00" })
    expect(store.annotations.value[1].strokeColor).toBe("#0000ff")
  })

  test("insertAnnotation inserts at specific index", () => {
    const r1 = makeRect()
    const r2 = makeRect()
    const r3 = makeRect()
    store.addAnnotation(r1)
    store.addAnnotation(r3)
    store.insertAnnotation(r2, 1)
    expect(store.annotations.value[0].id).toBe(r1.id)
    expect(store.annotations.value[1].id).toBe(r2.id)
    expect(store.annotations.value[2].id).toBe(r3.id)
  })

  test("getAnnotation finds by id", () => {
    const r = makeRect()
    store.addAnnotation(r)
    const found = store.getAnnotation(r.id)
    expect(found).toBeDefined()
    expect(found!.id).toBe(r.id)
  })

  test("getAnnotation returns undefined for missing id", () => {
    expect(store.getAnnotation("nonexistent")).toBeUndefined()
  })

  test("immutability: addAnnotation creates new array", () => {
    const r = makeRect()
    const before = store.annotations.value
    store.addAnnotation(r)
    expect(store.annotations.value).not.toBe(before)
  })

  test("immutability: removeAnnotation creates new array", () => {
    const r = makeRect()
    store.addAnnotation(r)
    const before = store.annotations.value
    store.removeAnnotation(r.id)
    expect(store.annotations.value).not.toBe(before)
  })

  test("immutability: updateAnnotation creates new array", () => {
    const r = makeRect()
    store.addAnnotation(r)
    const before = store.annotations.value
    store.updateAnnotation(r.id, { strokeColor: "#000" })
    expect(store.annotations.value).not.toBe(before)
  })
})

describe("SVG Commands", () => {
  let state: AnnotationStoreState
  let store: ReturnType<typeof useAnnotationStore>

  beforeEach(() => {
    state = createAnnotationState()
    store = useAnnotationStore(state)
  })

  describe("SvgCreateCommand", () => {
    test("execute adds annotation", () => {
      const r = makeRect()
      const cmd = createSvgCreateCommand(
        r,
        store.addAnnotation,
        (id) => store.removeAnnotation(id),
      )
      cmd.execute()
      expect(store.annotations.value).toHaveLength(1)
    })

    test("undo removes annotation", () => {
      const r = makeRect()
      const cmd = createSvgCreateCommand(
        r,
        store.addAnnotation,
        (id) => store.removeAnnotation(id),
      )
      cmd.execute()
      cmd.undo()
      expect(store.annotations.value).toHaveLength(0)
    })

    test("has correct label and layer", () => {
      const r = makeRect()
      const cmd = createSvgCreateCommand(
        r,
        store.addAnnotation,
        (id) => store.removeAnnotation(id),
      )
      expect(cmd.label).toBe("Create rect")
      expect(cmd.layer).toBe("svg")
    })
  })

  describe("SvgMutateCommand", () => {
    test("execute applies after patch", () => {
      const r = makeRect({ strokeColor: "#ff0000" })
      store.addAnnotation(r)
      const cmd = createSvgMutateCommand(
        r.id,
        { strokeColor: "#ff0000" },
        { strokeColor: "#00ff00" },
        store.updateAnnotation,
      )
      cmd.execute()
      expect(store.annotations.value[0].strokeColor).toBe("#00ff00")
    })

    test("undo applies before patch", () => {
      const r = makeRect({ strokeColor: "#ff0000" })
      store.addAnnotation(r)
      const cmd = createSvgMutateCommand(
        r.id,
        { strokeColor: "#ff0000" },
        { strokeColor: "#00ff00" },
        store.updateAnnotation,
      )
      cmd.execute()
      cmd.undo()
      expect(store.annotations.value[0].strokeColor).toBe("#ff0000")
    })

    test("has correct label and layer", () => {
      const cmd = createSvgMutateCommand(
        "any-id",
        {},
        {},
        store.updateAnnotation,
      )
      expect(cmd.label).toBe("Update annotation")
      expect(cmd.layer).toBe("svg")
    })
  })

  describe("SvgDeleteCommand", () => {
    test("execute removes annotation", () => {
      const r = makeRect()
      store.addAnnotation(r)
      const cmd = createSvgDeleteCommand(
        r,
        0,
        (id) => store.removeAnnotation(id),
        store.insertAnnotation,
      )
      cmd.execute()
      expect(store.annotations.value).toHaveLength(0)
    })

    test("undo restores annotation at original index", () => {
      const r1 = makeRect()
      const r2 = makeRect()
      const r3 = makeRect()
      store.addAnnotation(r1)
      store.addAnnotation(r2)
      store.addAnnotation(r3)

      // Delete the middle one (index 1)
      const cmd = createSvgDeleteCommand(
        r2,
        1,
        (id) => store.removeAnnotation(id),
        store.insertAnnotation,
      )
      cmd.execute()
      expect(store.annotations.value).toHaveLength(2)

      cmd.undo()
      expect(store.annotations.value).toHaveLength(3)
      expect(store.annotations.value[1].id).toBe(r2.id)
    })

    test("has correct label and layer", () => {
      const r = makeRect()
      const cmd = createSvgDeleteCommand(
        r,
        0,
        (id) => store.removeAnnotation(id),
        store.insertAnnotation,
      )
      expect(cmd.label).toBe("Delete rect")
      expect(cmd.layer).toBe("svg")
    })
  })
})
