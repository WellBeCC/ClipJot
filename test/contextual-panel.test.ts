import { describe, test, expect } from "bun:test"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const componentsDir = resolve(__dirname, "../src/components")

function readComponent(name: string): string {
  return readFileSync(resolve(componentsDir, name), "utf-8")
}

describe("ContextualPanel", () => {
  test("ContextualPanel.vue exists", () => {
    expect(existsSync(resolve(componentsDir, "ContextualPanel.vue"))).toBe(
      true,
    )
  })

  const panel = readComponent("ContextualPanel.vue")

  test("imports useSelection composable", () => {
    expect(panel).toContain("useSelection")
    expect(panel).toContain("selectedIds")
  })

  test("imports useAnnotationStore composable", () => {
    expect(panel).toContain("useAnnotationStore")
  })

  test("imports getAnnotationBounds for positioning", () => {
    expect(panel).toContain("getAnnotationBounds")
  })

  test("imports SvgMutateCommand for undo support", () => {
    expect(panel).toContain("createSvgMutateCommand")
  })

  test("shows only when exactly one annotation is selected", () => {
    expect(panel).toContain("selectedIds.value.size !== 1")
    expect(panel).toContain("visible")
  })

  test("imports and uses ColorPicker", () => {
    expect(panel).toContain("ColorPicker")
    expect(panel).toContain("onColorChange")
  })

  test("imports and uses StrokeWidthSelector", () => {
    expect(panel).toContain("StrokeWidthSelector")
    expect(panel).toContain("onWidthChange")
  })

  test("imports and uses OpacitySlider", () => {
    expect(panel).toContain("OpacitySlider")
    expect(panel).toContain("opacity")
  })

  test("imports and uses FillToggle", () => {
    expect(panel).toContain("FillToggle")
    expect(panel).toContain("fill")
  })

  test("has data-section attributes for property groups", () => {
    expect(panel).toContain('data-section="color"')
    expect(panel).toContain('data-section="width"')
    expect(panel).toContain('data-section="fill"')
    expect(panel).toContain('data-section="opacity"')
  })

  test("positions panel near annotation bounds", () => {
    expect(panel).toContain("panelStyle")
    expect(panel).toContain("getAnnotationBounds")
    expect(panel).toContain("PANEL_HEIGHT")
    expect(panel).toContain("PANEL_WIDTH")
  })

  test("commits changes via undoRedo.push", () => {
    expect(panel).toContain("undoRedo.push")
  })

  test("has ARIA toolbar role", () => {
    expect(panel).toContain('role="toolbar"')
    expect(panel).toContain('aria-label="Annotation properties"')
  })

  test("uses semantic tokens only, no Flexoki primitives", () => {
    const styleBlock = panel.slice(panel.indexOf("<style"))
    expect(styleBlock).not.toMatch(/var\(--flexoki-/)
    expect(styleBlock).toContain("var(--surface-elevated)")
    expect(styleBlock).toContain("var(--border-default)")
    expect(styleBlock).toContain("var(--border-subtle)")
    expect(styleBlock).toContain("var(--shadow-md)")
  })
})

describe("CanvasViewport includes ContextualPanel", () => {
  const viewport = readComponent("CanvasViewport.vue")

  test("imports ContextualPanel", () => {
    expect(viewport).toContain("ContextualPanel")
  })

  test("renders ContextualPanel in template", () => {
    expect(viewport).toContain("<ContextualPanel")
  })
})
