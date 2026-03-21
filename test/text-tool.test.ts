import { describe, test, expect, beforeEach } from "bun:test"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import type { TextAnnotation } from "../src/types/annotations"
import {
  createAnnotationState,
  useAnnotationStore,
} from "../src/composables/useAnnotationStore"
import type { AnnotationStoreState } from "../src/composables/useAnnotationStore"
import { sanitizeHtml, useTextEditing } from "../src/composables/useTextEditing"
import { serializeAnnotationsToSvg } from "../src/composables/useExport"

function makeTextAnnotation(
  overrides?: Partial<TextAnnotation>,
): TextAnnotation {
  return {
    id: crypto.randomUUID(),
    type: "text",
    x: 50,
    y: 50,
    width: 200,
    height: 100,
    htmlContent: "<b>Hello</b> world",
    fontFamily: "sans-serif",
    fontSize: 16,
    fill: false,
    fillColor: "#ffffff",
    rotation: 0,
    strokeColor: "#000000",
    strokeWidth: 0,
    selected: false,
    ...overrides,
  }
}

// ── HTML Sanitization (Appendix C.2 — XSS Prevention) ─────────────────────

describe("HTML sanitization", () => {
  test("preserves allowed tags: b, i, u, br", () => {
    const input = "<b>bold</b> <i>italic</i> <u>underline</u><br>"
    const result = sanitizeHtml(input)
    expect(result).toContain("<b>bold</b>")
    expect(result).toContain("<i>italic</i>")
    expect(result).toContain("<u>underline</u>")
    expect(result).toContain("<br>")
  })

  test("preserves span with allowed style properties", () => {
    const input =
      '<span style="font-size: 20px; color: red;">styled</span>'
    const result = sanitizeHtml(input)
    expect(result).toContain("font-size: 20px")
    expect(result).toContain("color: red")
    expect(result).toContain("styled")
  })

  test("strips script tags completely", () => {
    const input = '<script>alert("xss")</script>safe text'
    const result = sanitizeHtml(input)
    expect(result).not.toContain("script")
    expect(result).not.toContain("alert")
    expect(result).toContain("safe text")
  })

  test("strips iframe tags", () => {
    const input = '<iframe src="evil.com"></iframe>content'
    const result = sanitizeHtml(input)
    expect(result).not.toContain("iframe")
    expect(result).not.toContain("evil.com")
    expect(result).toContain("content")
  })

  test("strips event handlers from tags", () => {
    const input = '<b onclick="alert(1)">bold</b>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain("onclick")
    expect(result).toContain("<b>bold</b>")
  })

  test("strips disallowed tags but keeps text content", () => {
    const input = "<div>inside div</div><p>paragraph</p>"
    const result = sanitizeHtml(input)
    expect(result).not.toContain("<div>")
    expect(result).not.toContain("<p>")
    expect(result).toContain("inside div")
    expect(result).toContain("paragraph")
  })

  test("strips disallowed style properties from span", () => {
    const input =
      '<span style="font-size: 14px; background-image: url(evil); color: blue;">text</span>'
    const result = sanitizeHtml(input)
    expect(result).toContain("font-size: 14px")
    expect(result).toContain("color: blue")
    expect(result).not.toContain("background-image")
    expect(result).not.toContain("evil")
  })

  test("strips url() from style values", () => {
    const input =
      '<span style="color: url(javascript:alert(1));">text</span>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain("url(")
    expect(result).not.toContain("javascript")
  })

  test("strips expression() from style values", () => {
    const input =
      '<span style="color: expression(alert(1));">text</span>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain("expression")
  })

  test("strips attributes from b/i/u tags", () => {
    const input = '<b class="dangerous" id="x">bold</b>'
    const result = sanitizeHtml(input)
    expect(result).toBe("<b>bold</b>")
  })

  test("handles self-closing script tags", () => {
    const input = '<script src="evil.js"/>safe'
    const result = sanitizeHtml(input)
    expect(result).not.toContain("script")
    expect(result).toContain("safe")
  })

  test("handles nested dangerous tags", () => {
    const input = "<b><script>evil()</script>safe</b>"
    const result = sanitizeHtml(input)
    expect(result).not.toContain("script")
    expect(result).toContain("<b>")
    expect(result).toContain("safe")
    expect(result).toContain("</b>")
  })

  test("strips form elements", () => {
    const input =
      '<form action="steal.php"><input type="text"/></form>safe'
    const result = sanitizeHtml(input)
    expect(result).not.toContain("form")
    expect(result).not.toContain("input")
    expect(result).toContain("safe")
  })

  test("passes through plain text unchanged", () => {
    const input = "just plain text with no tags"
    expect(sanitizeHtml(input)).toBe(input)
  })

  test("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("")
  })
})

// ── Text annotation component structure ────────────────────────────────────

describe("TextAnnotation component", () => {
  test("TextAnnotation.vue exists", () => {
    expect(
      existsSync(
        resolve(
          __dirname,
          "../src/components/annotations/TextAnnotation.vue",
        ),
      ),
    ).toBe(true)
  })

  test("component uses foreignObject for display-only rendering", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/TextAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain("foreignObject")
    expect(source).toContain("v-html")
  })

  test("component emits start-editing event", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/TextAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain('"start-editing"')
  })

  test("component has isEditing prop", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/TextAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain("isEditing")
  })

  test("hides foreignObject when editing", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../src/components/annotations/TextAnnotation.vue",
      ),
      "utf-8",
    )
    expect(source).toContain("!isEditing")
  })
})

// ── Text editor overlay ────────────────────────────────────────────────────

describe("TextEditor overlay", () => {
  test("TextEditor.vue exists", () => {
    expect(
      existsSync(resolve(__dirname, "../src/components/TextEditor.vue")),
    ).toBe(true)
  })

  test("uses contenteditable div", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/TextEditor.vue"),
      "utf-8",
    )
    expect(source).toContain('contenteditable="true"')
  })

  test("supports bold/italic/underline via execCommand", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/TextEditor.vue"),
      "utf-8",
    )
    expect(source).toContain('execCommand("bold")')
    expect(source).toContain('execCommand("italic")')
    expect(source).toContain('execCommand("underline")')
  })

  test("intercepts paste events and sanitizes HTML", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/TextEditor.vue"),
      "utf-8",
    )
    expect(source).toContain("onPaste")
    expect(source).toContain("sanitizeHtml")
    expect(source).toContain("clipboardData")
  })

  test("emits delete on blur with empty content", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/TextEditor.vue"),
      "utf-8",
    )
    expect(source).toContain('emit("delete"')
  })

  test("emits commit on blur with content", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/TextEditor.vue"),
      "utf-8",
    )
    expect(source).toContain('emit("commit"')
  })

  test("has z-index 50 for overlay positioning", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/TextEditor.vue"),
      "utf-8",
    )
    expect(source).toContain("z-index: 50")
  })

  test("positioned absolutely to match annotation coords", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/TextEditor.vue"),
      "utf-8",
    )
    expect(source).toContain("position: absolute")
    expect(source).toContain("annotation.x")
    expect(source).toContain("annotation.y")
  })
})

// ── useTextEditing composable ──────────────────────────────────────────────

describe("useTextEditing composable", () => {
  test("useTextEditing.ts exists", () => {
    expect(
      existsSync(
        resolve(__dirname, "../src/composables/useTextEditing.ts"),
      ),
    ).toBe(true)
  })

  test("startEditing sets editingAnnotationId", () => {
    const { editingAnnotationId, startEditing } = useTextEditing()
    startEditing("test-id", "<b>content</b>")
    expect(editingAnnotationId.value).toBe("test-id")
  })

  test("commitEdit returns session info and clears state", () => {
    const { editingAnnotationId, startEditing, commitEdit } = useTextEditing()
    startEditing("test-id", "<b>original</b>")
    const result = commitEdit()
    expect(result).not.toBeNull()
    expect(result!.annotationId).toBe("test-id")
    expect(result!.previousHtml).toBe("<b>original</b>")
    expect(editingAnnotationId.value).toBeNull()
  })

  test("commitEdit returns null when not editing", () => {
    const { cancelEdit, commitEdit } = useTextEditing()
    cancelEdit() // ensure clean state
    expect(commitEdit()).toBeNull()
  })

  test("cancelEdit clears state", () => {
    const { editingAnnotationId, startEditing, cancelEdit } = useTextEditing()
    startEditing("test-id", "content")
    cancelEdit()
    expect(editingAnnotationId.value).toBeNull()
  })
})

// ── Empty-on-blur auto-deletion ────────────────────────────────────────────

describe("empty text annotation deletion", () => {
  let state: AnnotationStoreState
  let store: ReturnType<typeof useAnnotationStore>

  beforeEach(() => {
    state = createAnnotationState()
    store = useAnnotationStore(state)
  })

  test("text annotation with empty content can be removed from store", () => {
    const ann = makeTextAnnotation({ htmlContent: "" })
    store.addAnnotation(ann)
    expect(store.annotations.value).toHaveLength(1)

    store.removeAnnotation(ann.id)
    expect(store.annotations.value).toHaveLength(0)
  })

  test("text annotation removal preserves other annotations", () => {
    const textAnn = makeTextAnnotation()
    const rect = {
      id: crypto.randomUUID(),
      type: "rect" as const,
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
    store.addAnnotation(rect)
    store.addAnnotation(textAnn)
    expect(store.annotations.value).toHaveLength(2)

    store.removeAnnotation(textAnn.id)
    expect(store.annotations.value).toHaveLength(1)
    expect(store.annotations.value[0].type).toBe("rect")
  })
})

// ── SvgAnnotationLayer integration ─────────────────────────────────────────

describe("SvgAnnotationLayer text integration", () => {
  test("SvgAnnotationLayer imports TextAnnotation component", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/SvgAnnotationLayer.vue"),
      "utf-8",
    )
    expect(source).toContain(
      'import TextAnnotation from "./annotations/TextAnnotation.vue"',
    )
  })

  test("SvgAnnotationLayer renders text annotations", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/SvgAnnotationLayer.vue"),
      "utf-8",
    )
    expect(source).toContain("annotation.type === 'text'")
    expect(source).toContain("TextAnnotationType")
  })

  test("SvgAnnotationLayer emits start-text-editing", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/SvgAnnotationLayer.vue"),
      "utf-8",
    )
    expect(source).toContain('"start-text-editing"')
  })
})

// ── CanvasViewport text editor integration ─────────────────────────────────

describe("CanvasViewport text editor integration", () => {
  test("CanvasViewport imports TextEditor", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/CanvasViewport.vue"),
      "utf-8",
    )
    expect(source).toContain('import TextEditor from "./TextEditor.vue"')
  })

  test("CanvasViewport imports useTextEditing", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/CanvasViewport.vue"),
      "utf-8",
    )
    expect(source).toContain("useTextEditing")
  })

  test("CanvasViewport renders TextEditor conditionally", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/CanvasViewport.vue"),
      "utf-8",
    )
    expect(source).toContain("editingTextAnnotation")
    expect(source).toContain("TextEditor")
  })

  test("CanvasViewport handles text commit with SvgMutateCommand", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/CanvasViewport.vue"),
      "utf-8",
    )
    expect(source).toContain("createSvgMutateCommand")
    expect(source).toContain("onTextCommit")
  })

  test("CanvasViewport handles text deletion", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/components/CanvasViewport.vue"),
      "utf-8",
    )
    expect(source).toContain("onTextDelete")
    expect(source).toContain("removeAnnotation")
  })
})

// ── Export text rendering ──────────────────────────────────────────────────

describe("export text rendering", () => {
  test("serializeAnnotationsToSvg renders text via foreignObject", () => {
    const ann = makeTextAnnotation({ htmlContent: "<b>Hello</b>" })
    const svg = serializeAnnotationsToSvg([ann], 800, 600)
    expect(svg).toContain("foreignObject")
    expect(svg).toContain("<b>Hello</b>")
    expect(svg).toContain(`x="${ann.x}"`)
    expect(svg).toContain(`y="${ann.y}"`)
    expect(svg).toContain(`width="${ann.width}"`)
    expect(svg).toContain(`height="${ann.height}"`)
  })

  test("export sanitizes text annotation HTML content", () => {
    const ann = makeTextAnnotation({
      htmlContent: '<b>safe</b><script>evil()</script>',
    })
    const svg = serializeAnnotationsToSvg([ann], 800, 600)
    expect(svg).toContain("<b>safe</b>")
    expect(svg).not.toContain("script")
    expect(svg).not.toContain("evil")
  })

  test("export includes text annotation font styling", () => {
    const ann = makeTextAnnotation({
      fontFamily: "monospace",
      fontSize: 24,
      strokeColor: "#ff0000",
    })
    const svg = serializeAnnotationsToSvg([ann], 800, 600)
    expect(svg).toContain("font-family: monospace")
    expect(svg).toContain("font-size: 24px")
    expect(svg).toContain("color: #ff0000")
  })

  test("export includes background fill when enabled", () => {
    const ann = makeTextAnnotation({
      fill: true,
      fillColor: "#ffff00",
    })
    const svg = serializeAnnotationsToSvg([ann], 800, 600)
    expect(svg).toContain("background-color: #ffff00")
  })

  test("export omits background fill when disabled", () => {
    const ann = makeTextAnnotation({ fill: false })
    const svg = serializeAnnotationsToSvg([ann], 800, 600)
    expect(svg).not.toContain("background-color")
  })

  test("useExport has renderTextAnnotationToImage function", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/composables/useExport.ts"),
      "utf-8",
    )
    expect(source).toContain("renderTextAnnotationToImage")
    expect(source).toContain("foreignObject")
  })

  test("flattenTab draws text annotations individually", () => {
    const source = readFileSync(
      resolve(__dirname, "../src/composables/useExport.ts"),
      "utf-8",
    )
    expect(source).toContain("textAnnotations")
    expect(source).toContain('a.type === "text"')
  })
})

// ── TextAnnotation type structure ──────────────────────────────────────────

describe("TextAnnotation type", () => {
  test("has all required fields", () => {
    const ann = makeTextAnnotation()
    expect(ann.type).toBe("text")
    expect(ann.width).toBeDefined()
    expect(ann.height).toBeDefined()
    expect(ann.htmlContent).toBeDefined()
    expect(ann.fontFamily).toBeDefined()
    expect(ann.fontSize).toBeDefined()
    expect(ann.fill).toBeDefined()
    expect(ann.fillColor).toBeDefined()
  })

  test("defaults produce valid annotation", () => {
    const ann = makeTextAnnotation()
    expect(ann.width).toBeGreaterThan(0)
    expect(ann.height).toBeGreaterThan(0)
    expect(ann.fontSize).toBeGreaterThan(0)
    expect(typeof ann.htmlContent).toBe("string")
  })
})
