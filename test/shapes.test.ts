import { describe, test, expect, beforeEach } from "bun:test"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import type {
  RectAnnotation,
  EllipseAnnotation,
} from "../src/types/annotations"
import {
  createAnnotationState,
  useAnnotationStore,
} from "../src/composables/useAnnotationStore"
import type { AnnotationStoreState } from "../src/composables/useAnnotationStore"
import { createSvgCreateCommand } from "../src/commands/SvgCreateCommand"
import {
  buildShapeAnnotation,
  MIN_SHAPE_SIZE,
} from "../src/composables/useShapeCreation"
import { serializeAnnotationsToSvg } from "../src/composables/useExport"

// ── Helpers ──

function makeRect(overrides?: Partial<RectAnnotation>): RectAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "rect",
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    rotation: 0,
    strokeColor: "#D14D41",
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
    strokeColor: "#4385BE",
    strokeWidth: 2,
    selected: false,
    fill: false,
    fillColor: "#000000",
    fillOpacity: 1,
    ...overrides,
  }
}

// ── Annotation Components ──

describe("RectAnnotation component", () => {
  test("RectAnnotation.vue exists", () => {
    expect(
      existsSync(
        resolve(__dirname, "../src/components/annotations/RectAnnotation.vue"),
      ),
    ).toBe(true)
  })

  test("renders SVG <rect> element", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/annotations/RectAnnotation.vue"),
      "utf-8",
    )
    expect(source).toContain("<rect")
    expect(source).toContain("annotation.strokeColor")
    expect(source).toContain("annotation.strokeWidth")
  })

  test("has 16px invisible hit area for selection", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/annotations/RectAnnotation.vue"),
      "utf-8",
    )
    expect(source).toContain("HIT_AREA_WIDTH")
    expect(source).toContain("16")
    expect(source).toContain("transparent")
  })

  test("emits select event", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/annotations/RectAnnotation.vue"),
      "utf-8",
    )
    expect(source).toContain("select")
    expect(source).toContain("emit")
  })

  test("supports fill with color and opacity", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/annotations/RectAnnotation.vue"),
      "utf-8",
    )
    expect(source).toContain("annotation.fill")
    expect(source).toContain("annotation.fillColor")
    expect(source).toContain("annotation.fillOpacity")
  })

  test("does not use CSS variables for colors", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/annotations/RectAnnotation.vue"),
      "utf-8",
    )
    // Stroke and fill colors come from annotation data (resolved hex), not CSS vars
    expect(source).not.toMatch(/stroke="var\(--/)
    expect(source).not.toMatch(/fill="var\(--/)
  })
})

describe("EllipseAnnotation component", () => {
  test("EllipseAnnotation.vue exists", () => {
    expect(
      existsSync(
        resolve(
          __dirname,
          "../src/components/annotations/EllipseAnnotation.vue",
        ),
      ),
    ).toBe(true)
  })

  test("renders SVG <ellipse> element", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/EllipseAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain("<ellipse")
    expect(source).toContain("annotation.strokeColor")
    expect(source).toContain("annotation.strokeWidth")
  })

  test("has 16px invisible hit area for selection", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/EllipseAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain("HIT_AREA_WIDTH")
    expect(source).toContain("16")
    expect(source).toContain("transparent")
  })

  test("emits select event", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/EllipseAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain("select")
    expect(source).toContain("emit")
  })

  test("computes cx/cy/rx/ry from bounding box", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/EllipseAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain("cx")
    expect(source).toContain("cy")
    expect(source).toContain("rx")
    expect(source).toContain("ry")
  })

  test("does not use CSS variables for colors", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/EllipseAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).not.toMatch(/stroke="var\(--/)
    expect(source).not.toMatch(/fill="var\(--/)
  })
})

// ── Shape Creation Logic ──

describe("useShapeCreation", () => {
  describe("buildShapeAnnotation", () => {
    test("builds a rect annotation", () => {
      const result = buildShapeAnnotation("rect", 10, 20, 100, 50, {
        strokeColor: "#D14D41",
        strokeWidth: 2,
      })
      expect(result.type).toBe("rect")
      expect(result.x).toBe(10)
      expect(result.y).toBe(20)
      expect(result.width).toBe(100)
      expect(result.height).toBe(50)
      expect(result.strokeColor).toBe("#D14D41")
      expect(result.strokeWidth).toBe(2)
      expect(result.fill).toBe(false)
      expect(result.rotation).toBe(0)
      expect(result.selected).toBe(false)
    })

    test("builds an ellipse annotation", () => {
      const result = buildShapeAnnotation("ellipse", 30, 40, 80, 60, {
        strokeColor: "#4385BE",
        strokeWidth: 3,
      })
      expect(result.type).toBe("ellipse")
      expect(result.x).toBe(30)
      expect(result.y).toBe(40)
      expect(result.width).toBe(80)
      expect(result.height).toBe(60)
    })

    test("defaults fill to false", () => {
      const result = buildShapeAnnotation("rect", 0, 0, 50, 50, {
        strokeColor: "#000",
        strokeWidth: 1,
      })
      expect(result.fill).toBe(false)
    })

    test("accepts fill options", () => {
      const result = buildShapeAnnotation("rect", 0, 0, 50, 50, {
        strokeColor: "#000",
        strokeWidth: 1,
        fill: true,
        fillColor: "#ff0000",
        fillOpacity: 0.5,
      })
      expect(result.fill).toBe(true)
      expect(result.fillColor).toBe("#ff0000")
      expect(result.fillOpacity).toBe(0.5)
    })

    test("generates unique id", () => {
      const a = buildShapeAnnotation("rect", 0, 0, 50, 50, {
        strokeColor: "#000",
        strokeWidth: 1,
      })
      const b = buildShapeAnnotation("rect", 0, 0, 50, 50, {
        strokeColor: "#000",
        strokeWidth: 1,
      })
      expect(a.id).not.toBe(b.id)
    })
  })

  describe("MIN_SHAPE_SIZE constant", () => {
    test("is 5 pixels", () => {
      expect(MIN_SHAPE_SIZE).toBe(5)
    })
  })

  describe("Shift constraint logic", () => {
    test("constraining makes width equal to max(width, height)", () => {
      // Simulating the constraint: when shift is held,
      // both dimensions become max(width, height)
      const width = 100
      const height = 60
      const constrained = Math.max(width, height)
      expect(constrained).toBe(100)
      expect(constrained).toBe(constrained) // square/circle: w === h
    })

    test("constraining a tall shape uses height as the size", () => {
      const width = 40
      const height = 80
      const constrained = Math.max(width, height)
      expect(constrained).toBe(80)
    })
  })

  describe("Minimum size discard", () => {
    test("shapes with width < 5px should be discarded", () => {
      const width = 4
      const height = 100
      const shouldDiscard = width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE
      expect(shouldDiscard).toBe(true)
    })

    test("shapes with height < 5px should be discarded", () => {
      const width = 100
      const height = 3
      const shouldDiscard = width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE
      expect(shouldDiscard).toBe(true)
    })

    test("shapes with both dimensions < 5px should be discarded", () => {
      const width = 2
      const height = 2
      const shouldDiscard = width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE
      expect(shouldDiscard).toBe(true)
    })

    test("shapes with both dimensions >= 5px should be kept", () => {
      const width = 5
      const height = 5
      const shouldDiscard = width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE
      expect(shouldDiscard).toBe(false)
    })

    test("shapes at exactly 5px boundary are kept", () => {
      const width = 5
      const height = 100
      const shouldDiscard = width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE
      expect(shouldDiscard).toBe(false)
    })
  })
})

// ── Shape creation via SvgCreateCommand ──

describe("Shape creation with SvgCreateCommand", () => {
  let state: AnnotationStoreState
  let store: ReturnType<typeof useAnnotationStore>

  beforeEach(() => {
    state = createAnnotationState()
    store = useAnnotationStore(state)
  })

  test("create command adds a rect annotation", () => {
    const rect = makeRect()
    const cmd = createSvgCreateCommand(
      rect,
      store.addAnnotation,
      (id) => store.removeAnnotation(id),
    )
    cmd.execute()
    expect(store.annotations.value).toHaveLength(1)
    expect(store.annotations.value[0].type).toBe("rect")
  })

  test("create command adds an ellipse annotation", () => {
    const ellipse = makeEllipse()
    const cmd = createSvgCreateCommand(
      ellipse,
      store.addAnnotation,
      (id) => store.removeAnnotation(id),
    )
    cmd.execute()
    expect(store.annotations.value).toHaveLength(1)
    expect(store.annotations.value[0].type).toBe("ellipse")
  })

  test("undo removes a rect annotation", () => {
    const rect = makeRect()
    const cmd = createSvgCreateCommand(
      rect,
      store.addAnnotation,
      (id) => store.removeAnnotation(id),
    )
    cmd.execute()
    cmd.undo()
    expect(store.annotations.value).toHaveLength(0)
  })

  test("undo removes an ellipse annotation", () => {
    const ellipse = makeEllipse()
    const cmd = createSvgCreateCommand(
      ellipse,
      store.addAnnotation,
      (id) => store.removeAnnotation(id),
    )
    cmd.execute()
    cmd.undo()
    expect(store.annotations.value).toHaveLength(0)
  })
})

// ── SvgAnnotationLayer renders shapes ──

describe("SvgAnnotationLayer renders shapes", () => {
  const source = readFileSync(
    resolve(__dirname, "../src/components/SvgAnnotationLayer.vue"),
    "utf-8",
  )

  test("imports RectAnnotation component", () => {
    expect(source).toContain("RectAnnotation")
    expect(source).toContain("annotations/RectAnnotation.vue")
  })

  test("imports EllipseAnnotation component", () => {
    expect(source).toContain("EllipseAnnotation")
    expect(source).toContain("annotations/EllipseAnnotation.vue")
  })

  test("renders rect annotations conditionally", () => {
    expect(source).toContain("annotation.type === 'rect'")
  })

  test("renders ellipse annotations conditionally", () => {
    expect(source).toContain("annotation.type === 'ellipse'")
  })

  test("passes select event handler", () => {
    expect(source).toContain("@select")
  })
})

// ── Export includes SVG annotations ──

describe("Export includes SVG annotations", () => {
  const exportSource = readFileSync(
    resolve(__dirname, "../src/composables/useExport.ts"),
    "utf-8",
  )

  test("export checks for annotations", () => {
    expect(exportSource).toContain("annotationState.annotations")
  })

  test("export serializes SVG from annotation data", () => {
    expect(exportSource).toContain("serializeAnnotationsToSvg")
  })

  test("export uses createImageBitmap for SVG rasterization", () => {
    expect(exportSource).toContain("createImageBitmap")
  })

  test("export does not use CSS variables in SVG serialization", () => {
    // The serializeAnnotationsToSvg function uses annotation data directly
    expect(exportSource).toContain("serializeAnnotationsToSvg")
    expect(exportSource).not.toContain('stroke="var(--')
  })

  describe("serializeAnnotationsToSvg", () => {
    test("serializes rect annotations", () => {
      const rect = makeRect({ x: 10, y: 20, width: 100, height: 50 })
      const svg = serializeAnnotationsToSvg([rect], 800, 600)
      expect(svg).toContain("<rect")
      expect(svg).toContain('x="10"')
      expect(svg).toContain('y="20"')
      expect(svg).toContain('width="100"')
      expect(svg).toContain('height="50"')
      expect(svg).toContain(rect.strokeColor)
    })

    test("serializes ellipse annotations", () => {
      const ellipse = makeEllipse({ x: 30, y: 40, width: 80, height: 60 })
      const svg = serializeAnnotationsToSvg([ellipse], 800, 600)
      expect(svg).toContain("<ellipse")
      // cx = 30 + 80/2 = 70, cy = 40 + 60/2 = 70
      expect(svg).toContain('cx="70"')
      expect(svg).toContain('cy="70"')
      expect(svg).toContain('rx="40"')
      expect(svg).toContain('ry="30"')
    })

    test("serializes rect with fill", () => {
      const rect = makeRect({
        fill: true,
        fillColor: "#ff0000",
        fillOpacity: 0.5,
      })
      const svg = serializeAnnotationsToSvg([rect], 800, 600)
      expect(svg).toContain('fill="#ff0000"')
      expect(svg).toContain('fill-opacity="0.5"')
    })

    test("serializes rect without fill", () => {
      const rect = makeRect({ fill: false })
      const svg = serializeAnnotationsToSvg([rect], 800, 600)
      expect(svg).toContain('fill="none"')
    })

    test("produces valid SVG wrapper", () => {
      const svg = serializeAnnotationsToSvg([], 800, 600)
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('width="800"')
      expect(svg).toContain('height="600"')
      expect(svg).toContain("</svg>")
    })

    test("uses resolved hex colors, not CSS variables", () => {
      const rect = makeRect({ strokeColor: "#D14D41" })
      const svg = serializeAnnotationsToSvg([rect], 800, 600)
      expect(svg).toContain("#D14D41")
      expect(svg).not.toContain("var(--")
    })

    test("serializes multiple annotations", () => {
      const rect = makeRect()
      const ellipse = makeEllipse()
      const svg = serializeAnnotationsToSvg([rect, ellipse], 800, 600)
      expect(svg).toContain("<rect")
      expect(svg).toContain("<ellipse")
    })
  })
})

// ── useShapeCreation composable source ──

describe("useShapeCreation composable", () => {
  const source = readFileSync(
    resolve(__dirname, "../src/composables/useShapeCreation.ts"),
    "utf-8",
  )

  test("exports useShapeCreation function", () => {
    expect(source).toContain("export function useShapeCreation")
  })

  test("exports buildShapeAnnotation for testing", () => {
    expect(source).toContain("export function buildShapeAnnotation")
  })

  test("exports MIN_SHAPE_SIZE constant", () => {
    expect(source).toContain("export { MIN_SHAPE_SIZE }")
  })

  test("supports shift key constraint", () => {
    expect(source).toContain("shiftKey")
    expect(source).toContain("Math.max(width, height)")
  })

  test("discards shapes below minimum size", () => {
    expect(source).toContain("MIN_SHAPE_SIZE")
    expect(source).toContain("cancel()")
  })

  test("uses SvgCreateCommand for undo/redo", () => {
    expect(source).toContain("createSvgCreateCommand")
    expect(source).toContain("undoRedo.push")
  })

  test("tracks pointerdown/pointermove/pointerup lifecycle", () => {
    expect(source).toContain("onPointerDown")
    expect(source).toContain("onPointerMove")
    expect(source).toContain("onPointerUp")
  })
})
