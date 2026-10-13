---
title: "fix: Image export fails when vector graphics annotations are present"
type: fix
status: active
date: 2026-04-28
---

# fix: Image export fails when vector graphics annotations are present

## Overview

Adding any vector graphic annotation (arrow, text, rectangle, ellipse, line, callout) to a clipboard image breaks both the **Copy to clipboard** and **Save to file** actions. Without annotations, export works correctly. With annotations present, both actions fail silently (no error shown beyond a generic toast).

The flatten-and-export pipeline serializes all annotations into a single SVG string, rasterizes it with `createImageBitmap()`, and composites it onto an `OffscreenCanvas`. This pipeline is fragile in Tauri's WebKit runtime in two well-documented ways:

1. `<foreignObject>` (used by text annotations) is unreliably rasterized via `createImageBitmap()` in WebKit and frequently taints the destination canvas, causing `convertToBlob()` / `getImageData()` to throw.
2. `OffscreenCanvasRenderingContext2D` has a documented history of edge-case failures in WebKit (already burned us once — see `docs/solutions/2026-03-22-clipjot-bug-fixes-research.md` Fix 6).

This plan replaces the SVG-via-`createImageBitmap` rasterization with a WebKit-safe path, drops `OffscreenCanvas` from the export pipeline, and surfaces real errors so future regressions cannot hide.

## Problem Statement

### Symptom

After adding **any** annotation (arrow, text, rect, ellipse, line, callout) to an image:
- Pressing **Copy** → toast says "Copy failed" (or sometimes shows "Copied" but the system clipboard is unchanged).
- Pressing **Save** → file dialog appears, user picks a path, but no file is written.

### Reproduction (manual)

1. Put any image in the system clipboard.
2. Launch ClipJot — the image appears.
3. Select the **Arrow** tool, draw a single arrow on the image.
4. Press ⌘C (or click Copy). → Expected: clipboard now holds the annotated PNG. Actual: clipboard is unchanged or empty.
5. Press ⌘S (or click Save), choose a path, confirm. → Expected: PNG written. Actual: no file appears at the chosen path.
6. Repeat steps 3–5 with the Text tool, Rect tool, etc. — same failure.

Without step 3 (no annotation added), Copy and Save both work.

### Likely root cause

The export pipeline lives in `src/composables/useExport.ts`. Layer 4 (SVG annotations) is the only step that runs **only when annotations exist**, so it is the differential cause.

```ts
// src/composables/useExport.ts:110-118 — layer 4
if (tab.annotationState.annotations.value.length > 0) {
  const svgBitmap = await renderAnnotationsToImage(
    tab.annotationState.annotations.value,
    imgW,
    imgH,
  )
  ctx.drawImage(svgBitmap, 0, 0)        // ← may taint canvas
  svgBitmap.close()
}

// src/composables/useExport.ts:344-352
async function renderAnnotationsToImage(...): Promise<ImageBitmap> {
  const svgString = serializeAnnotationsToSvg(annotations, width, height)
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  return createImageBitmap(blob)        // ← flaky in WebKit, esp. with foreignObject
}
```

After this `drawImage` call, the export canvas is an `OffscreenCanvas`. Two failure modes are likely interacting:

- **Tainted canvas (likely the dominant cause).** Once an SVG-derived bitmap is drawn, WebKit treats the canvas as cross-origin-tainted in some configurations. The next call (`canvas.convertToBlob({ type: "image/png" })` for save, or `ctx.getImageData(...)` for clipboard) throws a `SecurityError`, which is then swallowed by the silent `catch (e) { error("Copy failed") }` in `AppShell.vue:handleCopy` (line 100). `handleSave` does log via `console.error` but the user only sees the generic toast.
- **createImageBitmap silently failing or rendering empty.** WebKit historically returns an empty/black bitmap when rasterizing SVG that contains `<foreignObject>`. For non-text annotations (arrow, rect, ...) this is not a foreignObject issue per se, but the same code path is exercised whenever **any** annotation list is non-empty. The `serializeAnnotationsToSvg` output always opens with the same SVG envelope, so the rasterizer is hit for every annotation type.

The most recent commit `928a89a` ("Fix arrow tool, fix tray icon behaviour") rewrote the arrow SVG path/polygon. If `controlX`/`controlY` are missing (`undefined`) on any prior-saved arrow annotation, the resulting polygon points become `NaN,NaN`, producing invalid SVG that `createImageBitmap` rejects. This is a secondary risk worth defending against, but is unlikely to be the dominant cause for **all** annotation types failing.

### Why current tests didn't catch this

`test/export.test.ts` and `test/export-full.test.ts` are **string-grep tests** against `useExport.ts` source code and pure-function tests of `serializeAnnotationsToSvg` (which only checks the SVG string). They never exercise the `createImageBitmap` → `drawImage` → `convertToBlob` chain. `test/integration/clipboard-round-trip.test.ts` exists but does not run with annotations present (need to verify).

## Proposed Solution

Make the SVG layer rasterization WebKit-safe by:

1. **Drop `OffscreenCanvas` from the export pipeline.** Use regular DOM `<canvas>` elements (created via `document.createElement("canvas")`) for the working canvas, the optional crop canvas, and the RGBA conversion canvas. This matches the precedent set by Fix 6 in `docs/solutions/2026-03-22-clipjot-bug-fixes-research.md`.
2. **Replace `createImageBitmap(svgBlob)` with the `Image()` + `img.onload` pattern.** Encode the SVG as a data URL (UTF-8 safe) and load it into an `HTMLImageElement` before drawing onto the regular canvas. This is the WebKit-blessed way to rasterize SVG.
3. **Set `img.crossOrigin = "anonymous"` is unnecessary for data URLs** — but the data URL approach avoids the cross-origin taint problem entirely because there is no fetch.
4. **Sanity-check arrow geometry** before serializing: skip arrows where `controlX`/`controlY`/`endX`/`endY` are not finite numbers, falling back to a straight-line arrow with a defaulted control point. Keeps stale data from poisoning the SVG.
5. **Surface real errors.** Replace silent toasts with `console.error("[ClipJot] Copy failed:", e)` in `handleCopy` (mirroring `handleSave`), and include the error message in the toast in dev builds.
6. **Add a real integration test** that flattens a tab containing each annotation type and asserts the resulting blob is non-empty and has plausible PNG magic bytes. Run in the actual Tauri WebView context if possible (Playwright); otherwise as a happy-dom/jsdom smoke test that at least exercises the code path.

### Why this approach

- **`Image()` + data URL is the canonical WebKit-safe path** for rasterizing inline SVG. Multiple production tools (image diffing, screenshot libraries) use this exact approach because `createImageBitmap` on SVG was buggy in Safari/WebKit for years.
- **Regular DOM canvas avoids OffscreenCanvas's known WebKit gaps** (no `ctx.filter`, occasional `convertToBlob` failures, inconsistent tainting behavior). Cost: a hidden DOM element per export call, which is negligible at user-action cadence.
- **Data URL avoids cross-origin tainting**, since `createImageBitmap(blob)` in WebKit can taint the destination canvas even though the blob is same-origin.
- **The change is localized to `useExport.ts`** — no API changes, no consumer changes.

### What this does NOT change

- `serializeAnnotationsToSvg()` output (still the same SVG string, with text in `<foreignObject>`).
- `useClipboard.ts` (the read path uses `OffscreenCanvas` for display-only WebP encoding — works fine because no SVG is involved). We can leave it alone in this PR.
- `RedactionCanvas.vue` and the freehand canvas — already DOM canvases per Fix 6.

### Alternative approaches considered

| Alternative | Why rejected |
|---|---|
| Render text annotations directly with Canvas 2D `fillText` (skip foreignObject) | Loses rich text (bold, italic, underline, color spans). Requires reimplementing wrapping/sanitized HTML rendering. Big surface area. |
| Pre-rasterize each annotation type to its own bitmap and composite | More allocations, breaks the "single SVG render pass" optimization (Appendix B.8) without meaningfully helping; same WebKit limitations apply. |
| Use a third-party SVG-to-canvas library (e.g., `canvg`) | Adds a heavy dependency. Most are not actively maintained for foreignObject. |
| Keep `OffscreenCanvas`, only fix the SVG rasterization | Fix 6 already documents OffscreenCanvas pain in WebKit. Removing it now closes the door on the next regression of this kind. |

## Technical Approach

### Architecture

Single file change: `src/composables/useExport.ts`. Plus tests, plus a one-liner in `AppShell.vue` for the copy error log.

```
src/composables/useExport.ts
  flattenTab()                            ← swap OffscreenCanvas → regular canvas
    └── renderAnnotationsToImage()        ← swap createImageBitmap(blob) → Image() + data URL
        └── serializeAnnotationsToSvg()   ← optional: defensive arrow geometry guard

src/components/AppShell.vue:handleCopy    ← add console.error so failures aren't silent
```

### Implementation phases

#### Phase 1: Reproduce + harness

- [ ] Add an integration test in `test/integration/annotation-export.test.ts` that:
  - Builds a `Tab` with one annotation of each type (rect, ellipse, arrow, line, callout, text).
  - Calls `flattenTab(tab)`.
  - Asserts the returned blob is non-empty.
  - Asserts the first 8 bytes match the PNG signature `89 50 4E 47 0D 0A 1A 0A`.
- [ ] Run the test — confirm it fails today (or skip if happy-dom can't `createImageBitmap` an SVG; at minimum prove the test wires up).
- [ ] Manually reproduce on the running app to confirm symptom matches Problem Statement.

**Why first:** locks in a regression test before any fix lands. If happy-dom can't reach the failure, escalate to a Playwright test inside Tauri (rare, but justified per `CLAUDE.md`).

#### Phase 2: Replace SVG rasterization path

- [ ] In `useExport.ts`, replace `renderAnnotationsToImage()`:

  ```ts
  // src/composables/useExport.ts (illustrative)
  async function renderAnnotationsToImage(
    annotations: Annotation[],
    width: number,
    height: number,
  ): Promise<HTMLImageElement> {
    const svgString = serializeAnnotationsToSvg(annotations, width, height)
    // UTF-8 safe data URL; avoids blob-URL CORS taint in WebKit
    const dataUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString)
    return await loadHtmlImage(dataUrl)
  }

  function loadHtmlImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = (e) =>
        reject(new Error(`Failed to load SVG annotation image: ${String(e)}`))
      img.src = src
    })
  }
  ```

- [ ] Update `flattenTab()` to use `HTMLImageElement` (no `.close()` needed; remove that call).
- [ ] Update `loadImageBitmap()` for the base image to return an `HTMLImageElement` too (for consistency — though `createImageBitmap` on a PNG blob is fine in WebKit, the unified path is simpler). Optional in this phase; mark as "if trivial".

#### Phase 3: Replace OffscreenCanvas with DOM canvas in the export pipeline

- [ ] In `flattenTab()`, replace `new OffscreenCanvas(imgW, imgH)` with `document.createElement("canvas")` + setting `.width`/`.height`. Same for the crop canvas.
- [ ] Replace `await canvas.convertToBlob({ type: "image/png" })` with a `canvas.toBlob(resolve, "image/png")` Promise wrapper.
- [ ] In `copyTabToClipboard()`, replace the `OffscreenCanvas` used for RGBA extraction with a DOM canvas. `getImageData` semantics are identical on regular canvases.
- [ ] Verify TypeScript types compile (the return shape changes from `OffscreenCanvas` to `HTMLCanvasElement`).

#### Phase 4: Defensive geometry guard for arrows

- [ ] In `serializeAnnotationsToSvg()` arrow case, guard against non-finite values:

  ```ts
  case "arrow": {
    const cx = Number.isFinite(a.controlX) ? a.controlX : 0
    const cy = Number.isFinite(a.controlY) ? a.controlY : 0
    // ... use cx/cy instead of a.controlX/a.controlY
  }
  ```

- [ ] Same guard for `endX`/`endY` (treat as `a.x`/`a.y` if missing, producing a degenerate arrow that's at least valid SVG).
- [ ] Add a unit test in `test/arrows.test.ts` that calls `serializeAnnotationsToSvg` with a malformed arrow and asserts no `NaN` appears in the output.

#### Phase 5: Make failures visible

- [ ] In `src/components/AppShell.vue:handleCopy` (line 95), add `console.error("[ClipJot] Copy failed:", e)` to the catch block so failures land in the dev console (matches `handleSave`).
- [ ] In dev builds (Vite `import.meta.env.DEV`), include `String(e).slice(0, 80)` in the toast for the next time something breaks. Production stays generic.

#### Phase 6: Verify

- [ ] `bun run tsc` — clean.
- [ ] `bun test` — all tests pass, including new ones.
- [ ] Manual run: clipboard image + arrow → Copy → paste in Preview/Photoshop → arrow visible. Same for Save → open the PNG → arrow visible.
- [ ] Repeat the manual run for each annotation type. Repeat once with text containing rich formatting (bold + color span) to confirm `<foreignObject>` rasterization works on the new path.

### Files affected

- `src/composables/useExport.ts` — primary change
- `src/components/AppShell.vue` — error logging in `handleCopy`
- `test/integration/annotation-export.test.ts` — new integration test
- `test/arrows.test.ts` — new geometry guard test
- `test/export.test.ts` and `test/export-full.test.ts` — update string-grep assertions that expect `OffscreenCanvas` and `createImageBitmap(blob)` to instead expect `Image` + data URL pattern

## System-Wide Impact

### Interaction graph

`Copy/Save action → AppShell.handle{Copy,Save} → copyTabToClipboard|saveTabToFile → flattenTab → renderAnnotationsToImage → serializeAnnotationsToSvg`. The change is contained to the bottom of this chain; callers see the same `Promise<ExportResult>` shape.

Tauri side: `writeImage` and `invoke("write_file")` are unchanged.

### Error propagation

Today, errors at the rasterization step throw `SecurityError` or `DOMException` and are swallowed by the silent catch in `handleCopy`. After this fix, errors will:
- Surface in the dev console via `console.error`.
- Show a more specific toast in dev builds.
- Still produce a user-friendly toast in production.

### State lifecycle risks

None. Both functions are atomic per Appendix A.5 — clipboard/file is only touched after the in-memory blob is fully formed. Failure mid-flight leaves the system clipboard and disk untouched. This invariant is preserved.

### API surface parity

`flattenTab` returns the same `ExportResult` shape. `copyTabToClipboard` and `saveTabToFile` keep their signatures. No external API changes.

### Integration test scenarios

1. **All-types flatten**: `flattenTab` on a tab with one of each annotation type returns a non-empty PNG blob.
2. **Round-trip clipboard**: write image with text annotation to clipboard, read back, decode, confirm pixel dimensions match.
3. **File save**: `saveTabToFile` to a temp path produces a valid PNG that can be re-opened and decoded.
4. **Stale arrow data**: arrow annotation with `controlX = undefined` does not throw and produces valid SVG.
5. **No-annotation regression guard**: existing flatten path (no annotations) still works — image with crop only, image with freehand only, image with redaction only.

## Acceptance Criteria

### Functional

- [ ] Copy to clipboard works when the image has at least one annotation of each type (rect, ellipse, arrow, line, callout, text).
- [ ] Save to file works when the image has at least one annotation of each type, and the resulting file opens in Preview/Finder QuickLook.
- [ ] Text annotations with rich formatting (bold + colored span) render correctly in the exported PNG.
- [ ] Existing exports (no annotations, freehand-only, redaction-only, crop-only) continue to work.

### Non-functional

- [ ] No new third-party dependencies.
- [ ] Export latency for a typical screenshot (~1920×1080, 3 annotations) stays under 500 ms on the dev machine.
- [ ] No new TypeScript or ESLint warnings.

### Quality gates

- [ ] `bun run tsc` clean.
- [ ] `bun test` all passing.
- [ ] New integration test for `flattenTab` with annotations lands and is green.
- [ ] Existing string-grep tests in `test/export.test.ts` and `test/export-full.test.ts` updated to match the new pattern (and not weakened — assert on the new contract).

## Success Metrics

- 0 silent export failures: every export either completes or surfaces a logged error.
- Manual smoke test of all six annotation types passes Copy and Save on macOS Tauri build.
- Issue stays closed (no regression report for 14 days post-merge).

## Dependencies & Risks

### Dependencies

- None new. Uses existing browser/WebKit APIs (`Image`, `HTMLCanvasElement`, `canvas.toBlob`).

### Risks

- **`<foreignObject>` rasterization could still fail in WebKit even with the data URL + `Image()` path** for some text edge cases (e.g., very long content, custom fonts). Mitigation: test with the rich-text fixture. If it fails, fall back to rendering text annotations via Canvas 2D `fillText` for plain text and a flag for rich content. Track as a follow-up if needed.
- **`canvas.toBlob` is async via callback, not Promise.** Need a small `toBlob → Promise` wrapper. Trivial.
- **DPI / backing store size differences** between OffscreenCanvas and DOM canvas. Mitigation: in tests, assert on returned `blob` width/height (which already come from the explicit `imgW`/`imgH`, not from any DPR scaling).
- **Test environment may not implement `Image` SVG rasterization correctly.** If happy-dom returns a 0×0 image, fall back to a Playwright-based test. The repo already uses `agent-browser` for browser automation per `CLAUDE.md`.
- **Hidden DOM canvas leakage.** If we forget to drop the canvas reference, GC will collect it but it's a brief allocation. No long-lived references introduced.

## Sources & References

### Internal references

- `src/composables/useExport.ts:56-144` — `flattenTab` (the core function being changed)
- `src/composables/useExport.ts:344-352` — `renderAnnotationsToImage` (the failing rasterizer)
- `src/composables/useExport.ts:308-330` — text annotation `<foreignObject>` serialization
- `src/composables/useExport.ts:250-289` — arrow SVG path (recently rewritten in `928a89a`)
- `src/components/AppShell.vue:89-103` — `handleCopy` (silent catch)
- `src/composables/useClipboard.ts:48-55` — `writeClipboardImage` (unchanged consumer)
- `docs/solutions/2026-03-22-clipjot-bug-fixes-research.md` — Fix 6 (WebKit OffscreenCanvas limitations, regular DOM canvas precedent)
- `CLAUDE.md` — testing guidance, Bun-only tooling, performance rules

### External references

- WebKit Bugzilla 207364 — `createImageBitmap` SVG taints canvas (long-standing)
- WebKit Bugzilla 23113 — `<foreignObject>` rasterization edge cases
- MDN: `HTMLCanvasElement.toBlob()` — Promise-wrapper pattern
- MDN: `Image()` — using data URLs for inline SVG rasterization

### Related work

- Commit `928a89a` "Fix arrow tool" — most recent change to the arrow SVG path; introduced the polygon arrowhead.
- Commit `73a0c8b` (Fix 6 in solutions doc) — moved freehand/redaction off `OffscreenCanvas` for the same WebKit reason.

## MVP Sketch

### `src/composables/useExport.ts`

```ts
// New helper — replaces createImageBitmap on SVG
function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`SVG load failed: ${String(e)}`))
    img.src = src
  })
}

// New helper — Promise wrapper over toBlob
function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      type,
    )
  })
}

async function renderAnnotationsToImage(
  annotations: Annotation[],
  width: number,
  height: number,
): Promise<HTMLImageElement> {
  const svgString = serializeAnnotationsToSvg(annotations, width, height)
  const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString)
  return loadHtmlImage(dataUrl)
}

export async function flattenTab(tab: Tab): Promise<ExportResult> {
  if (!tab.imageUrl) throw new Error("No image to export")

  const img = await loadImageBitmap(tab.imageUrl) // unchanged or also swapped to HTMLImageElement
  const imgW = img.width
  const imgH = img.height

  const canvas = document.createElement("canvas")
  canvas.width = imgW
  canvas.height = imgH
  const ctx = canvas.getContext("2d")!

  ctx.drawImage(img, 0, 0)
  if ("close" in img) (img as ImageBitmap).close()

  // ... freehand + redaction layers unchanged ...

  if (tab.annotationState.annotations.value.length > 0) {
    const svgImg = await renderAnnotationsToImage(
      tab.annotationState.annotations.value,
      imgW,
      imgH,
    )
    ctx.drawImage(svgImg, 0, 0) // HTMLImageElement does not taint when src is a data URL
  }

  const crop = tab.cropState.cropBounds.value
  if (crop) {
    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = crop.width
    exportCanvas.height = crop.height
    const exportCtx = exportCanvas.getContext("2d")!
    exportCtx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
    const blob = await canvasToBlob(exportCanvas)
    return { blob, width: crop.width, height: crop.height }
  }

  const blob = await canvasToBlob(canvas)
  return { blob, width: imgW, height: imgH }
}
```

### `test/integration/annotation-export.test.ts`

```ts
import { describe, test, expect } from "bun:test"
import { flattenTab } from "../../src/composables/useExport"

// Build a minimal Tab fixture with one of each annotation type, then assert the
// resulting blob is a non-empty PNG. Skipped if the test runtime can't load
// SVG via Image() — surfaced explicitly so we know to escalate to Playwright.
describe("annotation export end-to-end", () => {
  test("flattens a tab with all annotation types into a valid PNG", async () => {
    const tab = buildTabWithEveryAnnotationType() // helper; mirrors test/mocks.ts patterns
    const { blob } = await flattenTab(tab)
    expect(blob.size).toBeGreaterThan(0)
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(Array.from(head)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })
})
```

## Future Considerations

- **Strip PNG metadata** (deferred from v1; called out in `flattenTab` doc comment). Out of scope for this fix.
- **Render text without `<foreignObject>`** if WebKit foreignObject support continues to be flaky — long-term, a Canvas 2D text renderer with a small inline-formatting parser would eliminate this whole class of bug. Track separately.
- **Migrate the read path off OffscreenCanvas too** for consistency. Low priority — that path is display-only and works.
