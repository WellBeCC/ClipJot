import type { Tab } from "../types/tab"
import type { Annotation } from "../types/annotations"
import { renderRedactionRegion } from "./useRedaction"

export interface ExportResult {
  blob: Blob
  width: number
  height: number
}

/**
 * Flatten a tab's layers into a single PNG blob.
 * Draws base image, then freehand strokes on top.
 * Will be extended as more layers (SVG, redaction) are implemented.
 */
export async function flattenTab(tab: Tab): Promise<ExportResult> {
  if (!tab.imageUrl) {
    throw new Error("No image to export")
  }

  // Load the base image
  const img = await loadImage(tab.imageUrl)

  // Create offscreen canvas at image dimensions
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext("2d")!

  // Draw base image
  ctx.drawImage(img, 0, 0)

  // Destructive redaction: permanently flatten redaction regions onto base
  if (tab.redactionState.regions.value.length > 0) {
    // Use the current canvas as both base pixel source and render target
    // so redaction effects (pixelate, blur) read the actual base pixels.
    const baseCanvas = new OffscreenCanvas(img.width, img.height)
    const baseCtx = baseCanvas.getContext("2d")!
    baseCtx.drawImage(img, 0, 0)

    for (const region of tab.redactionState.regions.value) {
      renderRedactionRegion(
        ctx as unknown as CanvasRenderingContext2D,
        region,
        baseCtx as unknown as CanvasRenderingContext2D,
      )
    }
  }

  // Draw freehand strokes onto a temporary canvas, then composite
  if (tab.drawingState.strokes.value.length > 0) {
    const freehandCanvas = new OffscreenCanvas(img.width, img.height)
    const freehandCtx = freehandCanvas.getContext("2d")!
    tab.drawingState.redrawAll(
      freehandCtx as unknown as CanvasRenderingContext2D,
      img.width,
      img.height,
    )
    ctx.drawImage(freehandCanvas, 0, 0)
  }

  // Draw SVG annotations layer
  if (tab.annotationState.annotations.value.length > 0) {
    const svgBitmap = await renderAnnotationsToImage(
      tab.annotationState.annotations.value,
      img.width,
      img.height,
    )
    ctx.drawImage(svgBitmap, 0, 0)
    svgBitmap.close()
  }

  // Future: draw text overlays

  // Export as PNG
  const blob = await canvas.convertToBlob({ type: "image/png" })

  return {
    blob,
    width: img.width,
    height: img.height,
  }
}

/**
 * Copy the flattened image to the system clipboard.
 * Follows atomic export pattern: flatten FIRST, then write.
 * Never clears clipboard before the blob is ready.
 */
export async function copyTabToClipboard(tab: Tab): Promise<void> {
  // Step 1: Flatten to blob in memory (atomic — clipboard untouched)
  const { blob } = await flattenTab(tab);

  // Step 2: Convert PNG blob to RGBA for Tauri's clipboard API
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rgba = new Uint8Array(imageData.data.buffer);

  // Step 3: Write to clipboard (only now do we touch the clipboard)
  const { writeClipboardImage } = await import("./useClipboard");
  await writeClipboardImage(rgba, canvas.width, canvas.height);
}

/**
 * Serialize annotations into an SVG string with resolved hex colors.
 * CSS variables are NOT used here — annotation data already stores resolved hex
 * per Appendix A.4 (CSS custom properties break in serialized SVG contexts).
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
        const fill = a.fill
          ? `fill="${a.fillColor}" fill-opacity="${a.fillOpacity}"`
          : 'fill="none"'
        parts.push(
          `<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" stroke="${a.strokeColor}" stroke-width="${a.strokeWidth}" ${fill}/>`,
        )
        break
      }
      case "ellipse": {
        const cx = a.x + a.width / 2
        const cy = a.y + a.height / 2
        const rx = a.width / 2
        const ry = a.height / 2
        const fill = a.fill
          ? `fill="${a.fillColor}" fill-opacity="${a.fillOpacity}"`
          : 'fill="none"'
        parts.push(
          `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${a.strokeColor}" stroke-width="${a.strokeWidth}" ${fill}/>`,
        )
        break
      }
      case "arrow": {
        const midX = (a.x + a.endX) / 2
        const midY = (a.y + a.endY) / 2
        const cpX = midX + a.controlX
        const cpY = midY + a.controlY
        parts.push(
          `<path d="M ${a.x} ${a.y} Q ${cpX} ${cpY} ${a.endX} ${a.endY}" fill="none" stroke="${a.strokeColor}" stroke-width="${a.strokeWidth}" stroke-linecap="round"/>`,
        )
        break
      }
      case "line":
        parts.push(
          `<line x1="${a.x}" y1="${a.y}" x2="${a.endX}" y2="${a.endY}" stroke="${a.strokeColor}" stroke-width="${a.strokeWidth}" stroke-linecap="round"/>`,
        )
        break
      case "callout": {
        parts.push(
          `<circle cx="${a.x}" cy="${a.y}" r="${a.radius}" fill="${a.fillColor}" stroke="${a.strokeColor}" stroke-width="${a.strokeWidth}"/>`,
        )
        parts.push(
          `<text x="${a.x}" y="${a.y}" text-anchor="middle" dominant-baseline="central" fill="${a.strokeColor}" font-size="${a.radius}" font-family="sans-serif">${a.number}</text>`,
        )
        break
      }
      case "text":
        // Text annotations are handled separately (HTML overlay)
        break
    }
  }

  parts.push("</svg>")
  return parts.join("")
}

/**
 * Render annotations to an ImageBitmap for compositing onto the export canvas.
 * Builds SVG from annotation data (resolved hex colors), then rasterizes via Blob + createImageBitmap.
 */
async function renderAnnotationsToImage(
  annotations: Annotation[],
  width: number,
  height: number,
): Promise<ImageBitmap> {
  const svgString = serializeAnnotationsToSvg(annotations, width, height)
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  return createImageBitmap(blob)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
