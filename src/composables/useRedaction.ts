import { shallowRef } from "vue"
import type { ShallowRef } from "vue"
import type { RedactionRegion } from "../types/redaction"

export interface RedactionState {
  regions: ShallowRef<RedactionRegion[]>
}

/** Create per-tab redaction state. */
export function createRedactionState(): RedactionState {
  return {
    regions: shallowRef<RedactionRegion[]>([]),
  }
}

export function useRedactionStore(state: RedactionState) {
  function addRegion(region: RedactionRegion): void {
    state.regions.value = [...state.regions.value, region]
  }

  function removeRegion(id: string): RedactionRegion | undefined {
    const found = state.regions.value.find((r) => r.id === id)
    if (found) {
      state.regions.value = state.regions.value.filter((r) => r.id !== id)
    }
    return found
  }

  function updateRegion(
    id: string,
    patch: Partial<RedactionRegion>,
  ): void {
    state.regions.value = state.regions.value.map((r) =>
      r.id === id ? ({ ...r, ...patch } as RedactionRegion) : r,
    )
  }

  function insertRegion(region: RedactionRegion, index: number): void {
    const arr = [...state.regions.value]
    arr.splice(index, 0, region)
    state.regions.value = arr
  }

  function getRegion(id: string): RedactionRegion | undefined {
    return state.regions.value.find((r) => r.id === id)
  }

  return {
    regions: state.regions,
    addRegion,
    removeRegion,
    updateRegion,
    insertRegion,
    getRegion,
  }
}

/**
 * Render a single redaction region onto a canvas context.
 * Reads from baseCtx (the base image) for pixelation/blur effects.
 */
export function renderRedactionRegion(
  ctx: CanvasRenderingContext2D,
  region: RedactionRegion,
  baseCtx: CanvasRenderingContext2D,
): void {
  if (region.width <= 0 || region.height <= 0) return

  switch (region.style) {
    case "solid":
      renderSolid(ctx, region)
      break
    case "pixelate":
      renderPixelate(ctx, region, baseCtx)
      break
    case "blur":
      renderBlur(ctx, region, baseCtx)
      break
  }
}

function renderSolid(
  ctx: CanvasRenderingContext2D,
  region: RedactionRegion,
): void {
  ctx.fillStyle = region.solidColor
  ctx.fillRect(region.x, region.y, region.width, region.height)
}

function renderPixelate(
  ctx: CanvasRenderingContext2D,
  region: RedactionRegion,
  baseCtx: CanvasRenderingContext2D,
): void {
  const { x, y, width, height, blockSize } = region
  const imageData = baseCtx.getImageData(x, y, width, height)
  const { data } = imageData

  // Iterate over block-sized tiles and average their color
  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const bw = Math.min(blockSize, width - bx)
      const bh = Math.min(blockSize, height - by)
      let r = 0,
        g = 0,
        b = 0,
        count = 0

      for (let py = by; py < by + bh; py++) {
        for (let px = bx; px < bx + bw; px++) {
          const i = (py * width + px) * 4
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
      }

      if (count > 0) {
        ctx.fillStyle = `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`
        ctx.fillRect(x + bx, y + by, bw, bh)
      }
    }
  }
}

function renderBlur(
  ctx: CanvasRenderingContext2D,
  region: RedactionRegion,
  baseCtx: CanvasRenderingContext2D,
): void {
  const { x, y, width, height, blurRadius } = region

  ctx.save()

  // Clip to the redaction region
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  // Apply CSS blur filter and redraw the base image section
  ctx.filter = `blur(${blurRadius}px)`

  // Draw a slightly expanded area to avoid edge artifacts, clipped to region
  const pad = blurRadius * 2
  ctx.drawImage(
    baseCtx.canvas,
    Math.max(0, x - pad),
    Math.max(0, y - pad),
    width + pad * 2,
    height + pad * 2,
    Math.max(0, x - pad),
    Math.max(0, y - pad),
    width + pad * 2,
    height + pad * 2,
  )

  ctx.restore()
}
