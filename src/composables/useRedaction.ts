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

/**
 * Manual box blur applied in 3 passes (approximates Gaussian blur).
 * Uses horizontal then vertical pass per iteration, operating on raw
 * pixel data via getImageData/putImageData — no ctx.filter needed,
 * so it works in all browsers including Safari/WebKit.
 */
function renderBlur(
  ctx: CanvasRenderingContext2D,
  region: RedactionRegion,
  baseCtx: CanvasRenderingContext2D,
): void {
  const { x, y, width, height, blurRadius } = region
  if (width <= 0 || height <= 0) return

  const imageData = baseCtx.getImageData(x, y, width, height)
  const { data } = imageData
  const buf = new Uint8ClampedArray(data)

  // 3-pass box blur approximates Gaussian
  for (let pass = 0; pass < 3; pass++) {
    // Horizontal pass: data → buf
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0
        const minC = Math.max(0, col - blurRadius)
        const maxC = Math.min(width - 1, col + blurRadius)
        for (let k = minC; k <= maxC; k++) {
          const i = (row * width + k) * 4
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          a += data[i + 3]
          count++
        }
        const j = (row * width + col) * 4
        buf[j] = (r / count) | 0
        buf[j + 1] = (g / count) | 0
        buf[j + 2] = (b / count) | 0
        buf[j + 3] = (a / count) | 0
      }
    }

    // Vertical pass: buf → data
    for (let col = 0; col < width; col++) {
      for (let row = 0; row < height; row++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0
        const minR = Math.max(0, row - blurRadius)
        const maxR = Math.min(height - 1, row + blurRadius)
        for (let k = minR; k <= maxR; k++) {
          const i = (k * width + col) * 4
          r += buf[i]
          g += buf[i + 1]
          b += buf[i + 2]
          a += buf[i + 3]
          count++
        }
        const j = (row * width + col) * 4
        data[j] = (r / count) | 0
        data[j + 1] = (g / count) | 0
        data[j + 2] = (b / count) | 0
        data[j + 3] = (a / count) | 0
      }
    }
  }

  ctx.putImageData(imageData, x, y)
}
