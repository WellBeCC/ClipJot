import type { RedactStyle, RedactStrength } from "./tools"

/**
 * A single redaction region applied over the base image.
 * Non-destructive during editing session; flattened destructively on export.
 */
export interface RedactionRegion {
  /** Unique region identifier */
  readonly id: string
  /** Image-space x coordinate (top-left) */
  x: number
  /** Image-space y coordinate (top-left) */
  y: number
  /** Region width in image pixels */
  width: number
  /** Region height in image pixels */
  height: number
  /** Redaction rendering style */
  style: RedactStyle
  /** Fill color for solid redaction (default: black) */
  solidColor: string
  /** Pixel block size for pixelation */
  blockSize: number
  /** Box blur radius (per-pass radius for 3-pass box blur) */
  blurRadius: number
}

/** Default solid redaction color */
export const SOLID_DEFAULT_COLOR = "#000000"

// ── Strength presets ──

/** Pixelation block sizes per strength level */
export const PIXELATE_BLOCK_SIZES: Record<RedactStrength, number> = {
  1: 8,
  2: 16,
  3: 32,
}

/** Blur radii per strength level (3-pass box blur) */
export const BLUR_RADII: Record<RedactStrength, number> = {
  1: 4,
  2: 8,
  3: 16,
}

/** Get pixelation block size for a given strength */
export function blockSizeForStrength(strength: RedactStrength): number {
  return PIXELATE_BLOCK_SIZES[strength]
}

/** Get blur radius for a given strength */
export function blurRadiusForStrength(strength: RedactStrength): number {
  return BLUR_RADII[strength]
}
