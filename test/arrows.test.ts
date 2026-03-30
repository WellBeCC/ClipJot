import { describe, test, expect } from "bun:test"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const srcDir = resolve(__dirname, "../src")
const componentsDir = resolve(srcDir, "components")
const annotationsDir = resolve(componentsDir, "annotations")

function readFile(path: string): string {
  return readFileSync(path, "utf-8")
}

// ─── ArrowAnnotation Component ───────────────────────────────────────────────

describe("ArrowAnnotation Component", () => {
  test("ArrowAnnotation.vue exists", () => {
    expect(existsSync(resolve(annotationsDir, "ArrowAnnotation.vue"))).toBe(
      true,
    )
  })

  test("uses script setup with TypeScript", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain('<script setup lang="ts">')
  })

  test("imports ArrowAnnotation type", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain(
      'import type { ArrowAnnotation } from "../../types/annotations"',
    )
  })

  test("accepts annotation prop of type ArrowAnnotation", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain("annotation: ArrowAnnotation")
  })

  test("renders a quadratic Bezier path using Q command", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    // Path data should use M and Q commands
    expect(content).toContain("bezierPath")
    expect(content).toContain(":d=\"bezierPath\"")
    // Path construction uses Q for quadratic Bezier
    expect(content).toMatch(/M \$\{.*\} \$\{.*\} Q \$\{.*\} \$\{.*\}/)
  })

  test("computes absolute control point from midpoint + relative offset", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    // Must calculate midpoint
    expect(content).toContain("annotation.x + props.annotation.endX) / 2")
    expect(content).toContain("annotation.y + props.annotation.endY) / 2")
    // Then add control offsets
    expect(content).toContain("annotation.controlX")
    expect(content).toContain("annotation.controlY")
  })

  test("renders arrowhead as polygon element", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain("<polygon")
    expect(content).toContain(":points=\"arrowheadPoints\"")
  })

  test("arrowhead orientation uses tangent at endpoint (control→end direction)", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    // Tangent at t=1 of quadratic Bezier is direction from control to end
    expect(content).toContain("endX - cp.x")
    expect(content).toContain("endY - cp.y")
    // Unit vector calculation
    expect(content).toContain("Math.sqrt")
    // Perpendicular for wing points
    expect(content).toContain("ux")
    expect(content).toContain("uy")
  })

  test("has invisible 16px hit area for selection", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain("HIT_AREA_WIDTH = 16")
    expect(content).toContain("stroke=\"transparent\"")
    expect(content).toContain(":stroke-width=\"HIT_AREA_WIDTH\"")
    expect(content).toContain("arrow-hit-area")
  })

  test("shows guide lines when selected", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain("annotation.selected")
    expect(content).toContain("arrow-guide-line")
  })

  test("shows dashed guide lines when selected", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain("arrow-guide-line")
    expect(content).toContain('stroke-dasharray="4 3"')
  })

  test("uses resolved hex color for stroke, not CSS variables", () => {
    const content = readFile(resolve(annotationsDir, "ArrowAnnotation.vue"))
    expect(content).toContain(":stroke=\"annotation.strokeColor\"")
    expect(content).toContain(":fill=\"annotation.strokeColor\"")
    // No CSS variable references for annotation data
    expect(content).not.toContain("var(--")
  })
})

// ─── LineAnnotation Component ────────────────────────────────────────────────

describe("LineAnnotation Component", () => {
  test("LineAnnotation.vue exists", () => {
    expect(existsSync(resolve(annotationsDir, "LineAnnotation.vue"))).toBe(true)
  })

  test("uses script setup with TypeScript", () => {
    const content = readFile(resolve(annotationsDir, "LineAnnotation.vue"))
    expect(content).toContain('<script setup lang="ts">')
  })

  test("imports LineAnnotation type", () => {
    const content = readFile(resolve(annotationsDir, "LineAnnotation.vue"))
    expect(content).toContain(
      'import type { LineAnnotation } from "../../types/annotations"',
    )
  })

  test("accepts annotation prop of type LineAnnotation", () => {
    const content = readFile(resolve(annotationsDir, "LineAnnotation.vue"))
    expect(content).toContain("annotation: LineAnnotation")
  })

  test("renders SVG line element from start to end", () => {
    const content = readFile(resolve(annotationsDir, "LineAnnotation.vue"))
    expect(content).toContain("<line")
    expect(content).toContain(":x1=\"annotation.x\"")
    expect(content).toContain(":y1=\"annotation.y\"")
    expect(content).toContain(":x2=\"annotation.endX\"")
    expect(content).toContain(":y2=\"annotation.endY\"")
  })

  test("does not render arrowhead", () => {
    const content = readFile(resolve(annotationsDir, "LineAnnotation.vue"))
    expect(content).not.toContain("<polygon")
    expect(content).not.toContain("arrowhead")
  })

  test("has invisible 16px hit area", () => {
    const content = readFile(resolve(annotationsDir, "LineAnnotation.vue"))
    expect(content).toContain("HIT_AREA_WIDTH = 16")
    expect(content).toContain("stroke=\"transparent\"")
    expect(content).toContain(":stroke-width=\"HIT_AREA_WIDTH\"")
    expect(content).toContain("line-hit-area")
  })

  test("uses resolved hex color for stroke", () => {
    const content = readFile(resolve(annotationsDir, "LineAnnotation.vue"))
    expect(content).toContain(":stroke=\"annotation.strokeColor\"")
  })
})

// ─── SvgAnnotationLayer Integration ──────────────────────────────────────────

describe("SvgAnnotationLayer arrow/line integration", () => {
  const layerContent = readFile(
    resolve(componentsDir, "SvgAnnotationLayer.vue"),
  )

  test("imports ArrowAnnotation component", () => {
    expect(layerContent).toContain(
      'import ArrowAnnotation from "./annotations/ArrowAnnotation.vue"',
    )
  })

  test("imports LineAnnotation component", () => {
    expect(layerContent).toContain(
      'import LineAnnotation from "./annotations/LineAnnotation.vue"',
    )
  })

  test("renders ArrowAnnotation for arrow type", () => {
    expect(layerContent).toContain("<ArrowAnnotation")
    expect(layerContent).toContain("annotation.type === 'arrow'")
  })

  test("renders LineAnnotation for line type", () => {
    expect(layerContent).toContain("<LineAnnotation")
    expect(layerContent).toContain("annotation.type === 'line'")
  })

  test("imports ArrowAnnotation and LineAnnotation types", () => {
    expect(layerContent).toContain("ArrowAnnotation as ArrowAnnotationType")
    expect(layerContent).toContain("LineAnnotation as LineAnnotationType")
  })
})

// ─── SelectionHandles Bezier Control Point ───────────────────────────────────

describe("SelectionHandles Bezier control point", () => {
  const handlesContent = readFile(
    resolve(componentsDir, "SelectionHandles.vue"),
  )

  test("imports ArrowAnnotation type", () => {
    expect(handlesContent).toContain("ArrowAnnotation")
    expect(handlesContent).toContain('from "../types/annotations"')
  })

  test("detects arrow annotations", () => {
    expect(handlesContent).toContain('"arrow"')
  })

  test("computes control point position for arrows", () => {
    expect(handlesContent).toContain("controlPointPos")
    expect(handlesContent).toContain("a.controlX")
    expect(handlesContent).toContain("a.controlY")
  })

  test("renders circle handle for arrow control point", () => {
    expect(handlesContent).toContain("bezier-control-handle")
    expect(handlesContent).toContain(":cx=\"controlPointPos.x\"")
    expect(handlesContent).toContain(":cy=\"controlPointPos.y\"")
  })

  test("control point handle uses different color than resize handles", () => {
    // Resize handles use white fill with var(--interactive-default) stroke
    // Control point uses #AF3029 (Flexoki red) fill with white stroke
    expect(handlesContent).toContain('fill="#AF3029"')
    expect(handlesContent).toContain("bezier-control-handle")
  })

  test("control point handle only shows for arrow annotations", () => {
    expect(handlesContent).toContain('v-if="isArrow"')
  })
})
