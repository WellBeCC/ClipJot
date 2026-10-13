import type { Tab } from "../types/tab"
import type { Annotation } from "../types/annotations"
import { renderRedactionRegion } from "./useRedaction"
import { sanitizeHtml } from "./useTextEditing"

export interface ExportResult {
  blob: Blob
  width: number
  height: number
}

/**
 * Resolve a color string, stripping any CSS `var()` wrapper.
 * Annotations should already store resolved hex (Appendix A.4), but this
 * guard prevents CSS variables from leaking into serialized SVG contexts
 * where `var()` references cannot be evaluated.
 */
export function resolveCssColor(color: string): string {
  if (!color.startsWith("var(")) return color
  // Extract fallback from var(--name, fallback)
  const match = color.match(/var\([^,]+,\s*(.+)\)/)
  if (match) return match[1].trim()
  // No fallback — return black as safe default
  return "#000000"
}

/**
 * Load an image from a URL using fetch + createImageBitmap (Appendix B.7).
 * Avoids the legacy Image() + onload pattern for better performance
 * and compatibility with OffscreenCanvas workflows.
 */
async function loadImageBitmap(src: string): Promise<ImageBitmap> {
  const response = await fetch(src)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

/**
 * Load an image through an HTMLImageElement.
 *
 * Required for SVG: WebKit's createImageBitmap() cannot decode SVG blobs
 * ("Cannot decode the data in the argument to createImageBitmap"), so
 * annotation SVG must go through Image() instead.
 */
function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load annotation SVG"))
    img.src = src
  })
}

/** Create a regular DOM canvas of the given size. */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Promise wrapper around HTMLCanvasElement.toBlob. */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Failed to encode canvas as PNG"))
    }, "image/png")
  })
}

/** A region of a canvas, in canvas pixels. */
interface CanvasRegion {
  x: number
  y: number
  width: number
  height: number
}

/** Composited layers plus the region to export (crop or full image). */
interface FlattenedLayers {
  canvas: HTMLCanvasElement
  region: CanvasRegion
}

/**
 * Composite a tab's layers onto a full-size canvas.
 *
 * Layer compositing order (Unit 23):
 *   1. Base image
 *   2. Redaction regions (destructive — permanently baked into pixels)
 *   3. Freehand strokes
 *   4. SVG annotations (rect, ellipse, arrow, line, callout, text)
 *
 * Text annotations are batched into the single SVG render pass (Appendix B.8)
 * via serializeAnnotationsToSvg, which handles all annotation types including
 * text via foreignObject. No separate text rendering pass is needed.
 *
 * The canvas is always uncropped; the returned region holds the crop bounds
 * (or the full image) so each consumer extracts only what it needs.
 */
async function flattenLayers(tab: Tab): Promise<FlattenedLayers> {
  if (!tab.imageUrl) {
    throw new Error("No image to export")
  }

  // Load the base image via fetch + createImageBitmap (B.7)
  const img = await loadImageBitmap(tab.imageUrl)
  const imgW = img.width
  const imgH = img.height

  // Create full-size working canvas — all layers render at original dimensions.
  // Regular DOM canvas, not OffscreenCanvas: WebKit's OffscreenCanvas has
  // known gaps (see docs/solutions Fix 6).
  const canvas = createCanvas(imgW, imgH)
  const ctx = canvas.getContext("2d")!

  // ── Layer 1: Base image ──
  ctx.drawImage(img, 0, 0)
  img.close()

  // ── Layer 2: Freehand strokes ──
  if (tab.drawingState.strokes.value.length > 0) {
    const freehandEl = createCanvas(imgW, imgH)
    const freehandCtx = freehandEl.getContext("2d")!
    tab.drawingState.redrawAll(freehandCtx, imgW, imgH)
    ctx.drawImage(freehandEl, 0, 0)
  }

  // ── Layer 3: Destructive redaction ──
  // Applied after freehand so redactions cover drawings too.
  // Each region reads from the accumulated result so they stack correctly.
  // Use regular (non-offscreen) canvases because OffscreenCanvasRenderingContext2D
  // doesn't support ctx.filter in WebKit, breaking blur redaction.
  if (tab.redactionState.regions.value.length > 0) {
    // Working canvas with base + freehand composite for redaction source
    const workEl = createCanvas(imgW, imgH)
    const workCtx = workEl.getContext("2d")!
    workCtx.drawImage(canvas, 0, 0)

    // Apply each redaction sequentially (reads from + writes to workCtx)
    for (const region of tab.redactionState.regions.value) {
      renderRedactionRegion(workCtx, region, workCtx)
    }

    // Composite redacted result back to the export canvas
    ctx.clearRect(0, 0, imgW, imgH)
    ctx.drawImage(workEl, 0, 0)
  }

  // ── Layer 4: SVG annotations (all types including text) ──
  // All annotation types (rect, ellipse, arrow, line, callout, text) are
  // batched into a single SVG and rasterized in one pass (Appendix B.8).
  if (tab.annotationState.annotations.value.length > 0) {
    const svgImage = await renderAnnotationsToImage(
      tab.annotationState.annotations.value,
      imgW,
      imgH,
    )
    ctx.drawImage(svgImage, 0, 0, imgW, imgH)
  }

  // ── Export region ──
  // Crop bounds if set, otherwise the full canvas.
  const crop = tab.cropState.cropBounds.value
  const region = crop
    ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
    : { x: 0, y: 0, width: imgW, height: imgH }
  return { canvas, region }
}

/**
 * Flatten a tab's layers into a single PNG blob.
 *
 * If crop bounds are set, the export canvas is sized to the crop region
 * and only that portion of the composited image is exported.
 *
 * PNG metadata stripping is a known limitation deferred to v2.
 */
export async function flattenTab(tab: Tab): Promise<ExportResult> {
  const { canvas, region } = await flattenLayers(tab)
  const { width, height } = region

  if (width === canvas.width && height === canvas.height) {
    const blob = await canvasToBlob(canvas)
    return { blob, width, height }
  }

  // Crop via drawImage source-region extraction
  const exportCanvas = createCanvas(width, height)
  const exportCtx = exportCanvas.getContext("2d")!
  exportCtx.drawImage(
    canvas,
    region.x,
    region.y,
    width,
    height,
    0,
    0,
    width,
    height,
  )
  const blob = await canvasToBlob(exportCanvas)
  return { blob, width, height }
}

/**
 * Copy the flattened image to the system clipboard.
 *
 * Follows atomic export pattern (Appendix A.5):
 *   1. Flatten layers in memory — clipboard is UNTOUCHED
 *   2. Read RGBA pixels of the export region for Tauri's clipboard API
 *   3. Write to clipboard — only now do we modify the clipboard
 *
 * Pixels are read straight from the composited canvas. Going through a PNG
 * blob (encode, then decode back to RGBA) costs two full-image codec passes
 * for no benefit, since the clipboard API takes raw RGBA.
 *
 * If flatten fails (step 1), the clipboard is never cleared,
 * so the user never loses their current clipboard content.
 */
export async function copyTabToClipboard(tab: Tab): Promise<void> {
  // Step 1: Flatten layers in memory (atomic — clipboard untouched)
  const { canvas, region } = await flattenLayers(tab)

  // Step 2: Read RGBA of the export region (crop applied here, no extra canvas)
  const ctx = canvas.getContext("2d")!
  const imageData = ctx.getImageData(
    region.x,
    region.y,
    region.width,
    region.height,
  )
  const rgba = new Uint8Array(imageData.data.buffer)

  // Step 3: Write to clipboard (only now do we touch the clipboard)
  const { writeClipboardImage } = await import("./useClipboard")
  await writeClipboardImage(rgba, region.width, region.height)
}

/**
 * Save the flattened image to a file on disk via Tauri's backend.
 *
 * Follows atomic export pattern (Appendix A.5):
 *   1. Flatten to blob in memory
 *   2. Convert blob to byte array
 *   3. Write bytes to file via Tauri invoke
 *
 * @param tab - Tab to export
 * @param filePath - Absolute path to write the PNG file to
 */
export async function saveTabToFile(
  tab: Tab,
  filePath: string,
): Promise<void> {
  // Step 1: Flatten to blob in memory
  const { blob } = await flattenTab(tab)

  // Step 2: Convert blob to byte array
  const arrayBuffer = await blob.arrayBuffer()
  const data = Array.from(new Uint8Array(arrayBuffer))

  // Step 3: Write to file via Tauri backend
  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("write_file", { path: filePath, data })
}

/**
 * Serialize annotations into an SVG string with resolved hex colors.
 *
 * All color values are passed through resolveCssColor() to guard against
 * CSS `var()` references leaking into serialized SVG (Appendix A.4).
 * Annotation data SHOULD already store resolved hex, but this is a safety net.
 *
 * Text annotations are included via foreignObject (Appendix B.8: batch all
 * text into a single SVG for a single rasterization pass).
 */
export function serializeAnnotationsToSvg(
  annotations: Annotation[],
  width: number,
  height: number,
): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  ]

  for (const a of annotations) {
    switch (a.type) {
      case "rect": {
        const stroke = resolveCssColor(a.strokeColor)
        const fillColor = resolveCssColor(a.fillColor)
        const fill = a.fill
          ? `fill="${fillColor}" fill-opacity="${a.fillOpacity}"`
          : 'fill="none"'
        parts.push(
          `<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" stroke="${stroke}" stroke-width="${a.strokeWidth}" ${fill}/>`,
        )
        break
      }
      case "ellipse": {
        const stroke = resolveCssColor(a.strokeColor)
        const fillColor = resolveCssColor(a.fillColor)
        const cx = a.x + a.width / 2
        const cy = a.y + a.height / 2
        const rx = a.width / 2
        const ry = a.height / 2
        const fill = a.fill
          ? `fill="${fillColor}" fill-opacity="${a.fillOpacity}"`
          : 'fill="none"'
        parts.push(
          `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${stroke}" stroke-width="${a.strokeWidth}" ${fill}/>`,
        )
        break
      }
      case "arrow": {
        const stroke = resolveCssColor(a.strokeColor)
        const midX = (a.x + a.endX) / 2
        const midY = (a.y + a.endY) / 2
        const cpX = midX + a.controlX
        const cpY = midY + a.controlY

        // Tangent at t=1: direction from control point to endpoint
        const dx = a.endX - cpX
        const dy = a.endY - cpY
        const len = Math.sqrt(dx * dx + dy * dy)
        const ux = len === 0 ? 1 : dx / len
        const uy = len === 0 ? 0 : dy / len
        const px = -uy
        const py = ux

        // Arrowhead dimensions (mirror ArrowAnnotation.vue)
        const sw = a.strokeWidth
        const ahLength = Math.max(16, 10 + sw * 3)
        const ahWidth = Math.max(10, 6 + sw * 2)

        // Stop the line halfway into the arrowhead so the cap is hidden
        const stopX = a.endX - ux * (ahLength / 2)
        const stopY = a.endY - uy * (ahLength / 2)

        const baseX = a.endX - ux * ahLength
        const baseY = a.endY - uy * ahLength
        const leftX = baseX + px * ahWidth
        const leftY = baseY + py * ahWidth
        const rightX = baseX - px * ahWidth
        const rightY = baseY - py * ahWidth

        parts.push(
          `<path d="M ${a.x} ${a.y} Q ${cpX} ${cpY} ${stopX} ${stopY}" fill="none" stroke="${stroke}" stroke-width="${a.strokeWidth}" stroke-linecap="round"/>`,
        )
        parts.push(
          `<polygon points="${a.endX},${a.endY} ${leftX},${leftY} ${rightX},${rightY}" fill="${stroke}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`,
        )
        break
      }
      case "line": {
        const stroke = resolveCssColor(a.strokeColor)
        parts.push(
          `<line x1="${a.x}" y1="${a.y}" x2="${a.endX}" y2="${a.endY}" stroke="${stroke}" stroke-width="${a.strokeWidth}" stroke-linecap="round"/>`,
        )
        break
      }
      case "callout": {
        const stroke = resolveCssColor(a.strokeColor)
        const fillColor = resolveCssColor(a.fillColor)
        parts.push(
          `<circle cx="${a.x}" cy="${a.y}" r="${a.radius}" fill="${fillColor}" stroke="${stroke}" stroke-width="${a.strokeWidth}"/>`,
        )
        parts.push(
          `<text x="${a.x}" y="${a.y}" text-anchor="middle" dominant-baseline="central" fill="${stroke}" font-size="${a.radius}" font-family="sans-serif">${a.number}</text>`,
        )
        break
      }
      case "text": {
        const stroke = resolveCssColor(a.strokeColor)
        const fillColor = resolveCssColor(a.fillColor)
        const bgFill = a.fill ? `background-color: ${fillColor};` : ""
        const borderStyle =
          a.strokeWidth > 0
            ? `border: ${a.strokeWidth}px solid ${stroke};`
            : ""
        const safeHtml = sanitizeHtml(a.htmlContent)
        parts.push(
          `<foreignObject x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}">` +
            `<div xmlns="http://www.w3.org/1999/xhtml" style="` +
            `font-family: ${a.fontFamily}; font-size: ${a.fontSize}px; ` +
            `color: ${stroke}; ${bgFill} ${borderStyle} ` +
            `width: ${a.width}px; height: ${a.height}px; ` +
            `padding: 4px; box-sizing: border-box; ` +
            `word-wrap: break-word; white-space: pre-wrap; line-height: 1.4; ` +
            `overflow: hidden;">` +
            safeHtml +
            `</div>` +
            `</foreignObject>`,
        )
        break
      }
    }
  }

  parts.push("</svg>")
  return parts.join("")
}

/**
 * Render annotations to an image for compositing onto the export canvas.
 * Builds SVG from annotation data (resolved hex colors), then loads it as a
 * data URL through Image(). createImageBitmap() cannot be used here because
 * WebKit (Tauri's macOS runtime) rejects SVG input.
 */
async function renderAnnotationsToImage(
  annotations: Annotation[],
  width: number,
  height: number,
): Promise<HTMLImageElement> {
  const svgString = serializeAnnotationsToSvg(annotations, width, height)
  return loadHtmlImage(svgToDataUrl(svgString))
}

/** Encode an SVG string as a UTF-8 safe data URL. */
export function svgToDataUrl(svgString: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString)
}
