import { describe, test, expect } from "bun:test"
import { readFileSync } from "fs"
import { resolve } from "path"
import { ref } from "vue"
import { createViewportContext } from "../src/composables/useZoom"

const componentsDir = resolve(__dirname, "../src/components")

const viewportFile = readFileSync(
  resolve(componentsDir, "CanvasViewport.vue"),
  "utf-8",
)

// ─── Viewport context integration ──────────────────────────────────────────

describe("Zoom UI — Viewport Context Integration", () => {
  test("CanvasViewport imports createViewportContext", () => {
    expect(viewportFile).toContain(
      'import { createViewportContext } from "../composables/useZoom"',
    )
  })

  test("CanvasViewport creates a viewport context", () => {
    expect(viewportFile).toContain("createViewportContext(imageWidth, imageHeight)")
  })

  test("CanvasViewport delegates screenToImage to viewport context", () => {
    expect(viewportFile).toContain("viewport.screenToImage(sx, sy)")
  })
})

// ─── Transform style application ───────────────────────────────────────────

describe("Zoom UI — Transform Style", () => {
  test("layers div binds transform from viewport context", () => {
    expect(viewportFile).toContain("viewport.transformStyle.value")
  })

  test("layers div uses transform-origin: 0 0", () => {
    expect(viewportFile).toContain("transform-origin: 0 0")
  })

  test("layers div uses will-change: transform", () => {
    expect(viewportFile).toContain("will-change: transform")
  })
})

// ─── Scroll-wheel zoom ────────────────────────────────────────────────────

describe("Zoom UI — Wheel Zoom", () => {
  test("CanvasViewport has @wheel handler", () => {
    expect(viewportFile).toContain("@wheel=")
  })

  test("wheel handler checks for metaKey or ctrlKey", () => {
    expect(viewportFile).toContain("e.metaKey")
    expect(viewportFile).toContain("e.ctrlKey")
  })

  test("wheel handler calls setZoom", () => {
    expect(viewportFile).toContain("viewport.setZoom(newScale)")
  })

  test("wheel handler adjusts pan to zoom toward cursor", () => {
    // After zoom, pan is recalculated to keep cursor-point stable
    expect(viewportFile).toContain(
      "viewport.panX.value = cursorX - imgPt.x * viewport.scale.value",
    )
    expect(viewportFile).toContain(
      "viewport.panY.value = cursorY - imgPt.y * viewport.scale.value",
    )
  })
})

// ─── Middle-mouse-button pan ──────────────────────────────────────────────

describe("Zoom UI — Middle-Mouse Pan", () => {
  test("CanvasViewport has pointer event handlers", () => {
    expect(viewportFile).toContain("@pointerdown=")
    expect(viewportFile).toContain("@pointermove=")
    expect(viewportFile).toContain("@pointerup=")
  })

  test("pointerdown handler checks for middle button", () => {
    expect(viewportFile).toContain("e.button !== 1")
  })

  test("pan handler captures pointer", () => {
    expect(viewportFile).toContain("setPointerCapture")
    expect(viewportFile).toContain("releasePointerCapture")
  })
})

// ─── Fit-to-window on mount & resize ──────────────────────────────────────

describe("Zoom UI — Fit To Window", () => {
  test("CanvasViewport creates a ResizeObserver", () => {
    expect(viewportFile).toContain("new ResizeObserver")
  })

  test("CanvasViewport calls fitToWindow on mount", () => {
    expect(viewportFile).toContain("callFitToWindow()")
  })

  test("CanvasViewport watches activeTab imageUrl to re-fit", () => {
    expect(viewportFile).toContain("activeTab.value?.imageUrl")
    expect(viewportFile).toContain("callFitToWindow")
  })

  test("CanvasViewport disconnects ResizeObserver on unmount", () => {
    expect(viewportFile).toContain("resizeObserver?.disconnect()")
  })
})

// ─── Zoom indicator badge ─────────────────────────────────────────────────

describe("Zoom UI — Zoom Badge", () => {
  test("CanvasViewport has a zoom badge element", () => {
    expect(viewportFile).toContain("canvas-viewport__zoom-badge")
  })

  test("zoom badge displays percentage", () => {
    expect(viewportFile).toContain("zoomPercent")
  })

  test("zoom badge uses semantic tokens not Flexoki primitives", () => {
    const styleSection = viewportFile.slice(viewportFile.indexOf("<style"))
    expect(styleSection).not.toMatch(/var\(--flexoki-/)
  })

  test("zoom badge uses aria-live for accessibility", () => {
    expect(viewportFile).toContain('aria-live="polite"')
  })
})

// ─── CSS structure ────────────────────────────────────────────────────────

describe("Zoom UI — CSS Structure", () => {
  test("viewport no longer uses flex centering (pan handles position)", () => {
    const styleSection = viewportFile.slice(viewportFile.indexOf("<style"))
    // Should NOT have align-items/justify-content on the viewport itself
    // since pan/translate now controls positioning
    expect(styleSection).not.toContain("align-items: center")
    expect(styleSection).not.toContain("justify-content: center")
  })

  test("base image no longer has max-width/max-height constraints", () => {
    const styleSection = viewportFile.slice(viewportFile.indexOf("<style"))
    expect(styleSection).not.toContain("max-width: 100%")
    expect(styleSection).not.toContain("max-height: 100%")
  })

  test("layers container is absolutely positioned", () => {
    expect(viewportFile).toContain("position: absolute")
  })
})

// ─── Zoom-toward-cursor math (unit test) ──────────────────────────────────

describe("Zoom UI — Zoom-toward-cursor math", () => {
  test("zooming in keeps the cursor image point stable", () => {
    const ctx = createViewportContext(ref(1000), ref(800))
    ctx.fitToWindow(500, 400)

    // At fit: scale = 0.5, panX = 0, panY = 0 (exact fit)
    // Cursor at viewport center (250, 200)
    const cursorX = 250
    const cursorY = 200

    // Image point under cursor before zoom
    const imgPt = ctx.screenToImage(cursorX, cursorY)

    // Simulate zoom in
    const newScale = ctx.scale.value + 0.1
    ctx.setZoom(newScale)
    ctx.panX.value = cursorX - imgPt.x * ctx.scale.value
    ctx.panY.value = cursorY - imgPt.y * ctx.scale.value

    // After zoom, the same image point should map back to the cursor
    const afterPt = ctx.screenToImage(cursorX, cursorY)
    expect(Math.abs(afterPt.x - imgPt.x)).toBeLessThan(0.01)
    expect(Math.abs(afterPt.y - imgPt.y)).toBeLessThan(0.01)
  })

  test("zooming out keeps the cursor image point stable", () => {
    const ctx = createViewportContext(ref(1000), ref(800))
    ctx.scale.value = 2
    ctx.panX.value = -100
    ctx.panY.value = -50

    const cursorX = 300
    const cursorY = 200
    const imgPt = ctx.screenToImage(cursorX, cursorY)

    // Simulate zoom out
    const newScale = ctx.scale.value - 0.1
    ctx.setZoom(newScale)
    ctx.panX.value = cursorX - imgPt.x * ctx.scale.value
    ctx.panY.value = cursorY - imgPt.y * ctx.scale.value

    const afterPt = ctx.screenToImage(cursorX, cursorY)
    expect(Math.abs(afterPt.x - imgPt.x)).toBeLessThan(0.01)
    expect(Math.abs(afterPt.y - imgPt.y)).toBeLessThan(0.01)
  })
})
