import { describe, test, expect, beforeEach } from "bun:test"
import type { Annotation, CalloutAnnotation } from "../src/types/annotations"
import {
  createAnnotationState,
  useAnnotationStore,
} from "../src/composables/useAnnotationStore"
import type { AnnotationStoreState } from "../src/composables/useAnnotationStore"
import { createCalloutDeleteCommand } from "../src/commands/CalloutDeleteCommand"

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

// -- Contrast color logic (mirrored from component for unit testing) --

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

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getContrastTextColor(fillColor: string): string {
  return relativeLuminance(fillColor) < 0.5 ? "#ffffff" : "#000000"
}

describe("Callout numbering", () => {
  let state: AnnotationStoreState
  let store: ReturnType<typeof useAnnotationStore>

  beforeEach(() => {
    state = createAnnotationState()
    store = useAnnotationStore(state)
  })

  describe("getNextCalloutNumber", () => {
    test("returns 1 when no callouts exist", () => {
      expect(store.getNextCalloutNumber()).toBe(1)
    })

    test("returns max + 1 for sequential callouts", () => {
      store.addAnnotation(makeCallout({ number: 1 }))
      store.addAnnotation(makeCallout({ number: 2 }))
      store.addAnnotation(makeCallout({ number: 3 }))
      expect(store.getNextCalloutNumber()).toBe(4)
    })

    test("ignores non-callout annotations", () => {
      store.addAnnotation({
        id: crypto.randomUUID(),
        type: "rect",
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        rotation: 0,
        strokeColor: "#ff0000",
        strokeWidth: 2,
        selected: false,
        fill: false,
        fillColor: "#000000",
        fillOpacity: 1,
      })
      expect(store.getNextCalloutNumber()).toBe(1)
    })

    test("finds max even with gaps", () => {
      store.addAnnotation(makeCallout({ number: 1 }))
      store.addAnnotation(makeCallout({ number: 5 }))
      expect(store.getNextCalloutNumber()).toBe(6)
    })
  })

  describe("renumberCallouts", () => {
    test("renumbers callouts sequentially by array order", () => {
      const c1 = makeCallout({ number: 1 })
      const c2 = makeCallout({ number: 3 })
      const c3 = makeCallout({ number: 7 })
      store.addAnnotation(c1)
      store.addAnnotation(c2)
      store.addAnnotation(c3)

      store.renumberCallouts()

      const callouts = store.annotations.value.filter(
        (a): a is CalloutAnnotation => a.type === "callout",
      )
      expect(callouts.map((c) => c.number)).toEqual([1, 2, 3])
    })

    test("preserves non-callout annotations", () => {
      const rect: Annotation = {
        id: crypto.randomUUID(),
        type: "rect",
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        rotation: 0,
        strokeColor: "#ff0000",
        strokeWidth: 2,
        selected: false,
        fill: false,
        fillColor: "#000000",
        fillOpacity: 1,
      }
      store.addAnnotation(makeCallout({ number: 5 }))
      store.addAnnotation(rect)
      store.addAnnotation(makeCallout({ number: 10 }))

      store.renumberCallouts()

      expect(store.annotations.value[0].type).toBe("callout")
      expect((store.annotations.value[0] as CalloutAnnotation).number).toBe(1)
      expect(store.annotations.value[1].type).toBe("rect")
      expect(store.annotations.value[2].type).toBe("callout")
      expect((store.annotations.value[2] as CalloutAnnotation).number).toBe(2)
    })

    test("no-op when already sequential", () => {
      const c1 = makeCallout({ number: 1 })
      const c2 = makeCallout({ number: 2 })
      store.addAnnotation(c1)
      store.addAnnotation(c2)

      const before = store.annotations.value
      store.renumberCallouts()
      // Array reference should be unchanged when nothing changes
      expect(store.annotations.value).toBe(before)
    })
  })

  describe("sequential placement", () => {
    test("placing callouts produces sequential numbers 1, 2, 3", () => {
      const c1 = makeCallout({ number: store.getNextCalloutNumber() })
      store.addAnnotation(c1)

      const c2 = makeCallout({ number: store.getNextCalloutNumber() })
      store.addAnnotation(c2)

      const c3 = makeCallout({ number: store.getNextCalloutNumber() })
      store.addAnnotation(c3)

      const numbers = store.annotations.value.map(
        (a) => (a as CalloutAnnotation).number,
      )
      expect(numbers).toEqual([1, 2, 3])
    })
  })
})

describe("CalloutDeleteCommand", () => {
  let state: AnnotationStoreState
  let store: ReturnType<typeof useAnnotationStore>

  beforeEach(() => {
    state = createAnnotationState()
    store = useAnnotationStore(state)
  })

  test("deleting #2 of (1,2,3) renumbers to (1,2)", () => {
    const c1 = makeCallout({ number: 1, x: 50 })
    const c2 = makeCallout({ number: 2, x: 100 })
    const c3 = makeCallout({ number: 3, x: 150 })
    store.addAnnotation(c1)
    store.addAnnotation(c2)
    store.addAnnotation(c3)

    const cmd = createCalloutDeleteCommand(
      c2,
      1,
      store.annotations.value,
      (id) => store.removeAnnotation(id),
      store.insertAnnotation,
      store.updateAnnotation,
    )
    cmd.execute()

    expect(store.annotations.value).toHaveLength(2)
    const numbers = store.annotations.value.map(
      (a) => (a as CalloutAnnotation).number,
    )
    expect(numbers).toEqual([1, 2])
  })

  test("undo restores deleted callout and original numbers", () => {
    const c1 = makeCallout({ number: 1, x: 50 })
    const c2 = makeCallout({ number: 2, x: 100 })
    const c3 = makeCallout({ number: 3, x: 150 })
    store.addAnnotation(c1)
    store.addAnnotation(c2)
    store.addAnnotation(c3)

    const cmd = createCalloutDeleteCommand(
      c2,
      1,
      store.annotations.value,
      (id) => store.removeAnnotation(id),
      store.insertAnnotation,
      store.updateAnnotation,
    )
    cmd.execute()
    cmd.undo()

    expect(store.annotations.value).toHaveLength(3)
    const numbers = store.annotations.value.map(
      (a) => (a as CalloutAnnotation).number,
    )
    expect(numbers).toEqual([1, 2, 3])
    // Verify the restored callout is at the correct position
    expect(store.annotations.value[1].id).toBe(c2.id)
  })

  test("deleting #1 of (1,2,3) renumbers to (1,2)", () => {
    const c1 = makeCallout({ number: 1 })
    const c2 = makeCallout({ number: 2 })
    const c3 = makeCallout({ number: 3 })
    store.addAnnotation(c1)
    store.addAnnotation(c2)
    store.addAnnotation(c3)

    const cmd = createCalloutDeleteCommand(
      c1,
      0,
      store.annotations.value,
      (id) => store.removeAnnotation(id),
      store.insertAnnotation,
      store.updateAnnotation,
    )
    cmd.execute()

    const numbers = store.annotations.value.map(
      (a) => (a as CalloutAnnotation).number,
    )
    expect(numbers).toEqual([1, 2])
  })

  test("deleting last callout leaves empty array", () => {
    const c1 = makeCallout({ number: 1 })
    store.addAnnotation(c1)

    const cmd = createCalloutDeleteCommand(
      c1,
      0,
      store.annotations.value,
      (id) => store.removeAnnotation(id),
      store.insertAnnotation,
      store.updateAnnotation,
    )
    cmd.execute()

    expect(store.annotations.value).toHaveLength(0)
  })

  test("has correct label and layer", () => {
    const c1 = makeCallout({ number: 1 })
    store.addAnnotation(c1)

    const cmd = createCalloutDeleteCommand(
      c1,
      0,
      store.annotations.value,
      (id) => store.removeAnnotation(id),
      store.insertAnnotation,
      store.updateAnnotation,
    )
    expect(cmd.label).toBe("Delete callout")
    expect(cmd.layer).toBe("svg")
  })
})

describe("Callout contrast color", () => {
  test("white text on dark fill (black)", () => {
    expect(getContrastTextColor("#000000")).toBe("#ffffff")
  })

  test("white text on dark fill (dark red)", () => {
    expect(getContrastTextColor("#800000")).toBe("#ffffff")
  })

  test("white text on dark fill (dark blue)", () => {
    expect(getContrastTextColor("#000080")).toBe("#ffffff")
  })

  test("dark text on light fill (white)", () => {
    expect(getContrastTextColor("#ffffff")).toBe("#000000")
  })

  test("dark text on light fill (yellow)", () => {
    expect(getContrastTextColor("#ffff00")).toBe("#000000")
  })

  test("dark text on light fill (light gray)", () => {
    expect(getContrastTextColor("#cccccc")).toBe("#000000")
  })

  test("white text on medium-dark fill (medium blue)", () => {
    // #0000ff has very low luminance (~0.072)
    expect(getContrastTextColor("#0000ff")).toBe("#ffffff")
  })

  test("handles shorthand 3-char hex", () => {
    expect(getContrastTextColor("#000")).toBe("#ffffff")
    expect(getContrastTextColor("#fff")).toBe("#000000")
  })
})

describe("Callout component structure", () => {
  test("CalloutAnnotation type has required fields", () => {
    const callout = makeCallout()
    expect(callout.type).toBe("callout")
    expect(callout.number).toBeDefined()
    expect(callout.radius).toBeDefined()
    expect(callout.fillColor).toBeDefined()
    expect(callout.x).toBeDefined()
    expect(callout.y).toBeDefined()
    expect(callout.strokeColor).toBeDefined()
    expect(callout.strokeWidth).toBeDefined()
  })

  test("callout defaults produce valid annotation", () => {
    const callout = makeCallout()
    expect(callout.number).toBeGreaterThan(0)
    expect(callout.radius).toBeGreaterThan(0)
    expect(callout.fillColor).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})
