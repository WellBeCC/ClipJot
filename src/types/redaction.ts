import type { RedactStyle } from "./tools"

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
  /** Pixel block size for pixelation (clamped to PIXELATE_MIN..PIXELATE_MAX) */
  blockSize: number
  /** Gaussian blur radius for blur redaction (clamped to BLUR_MIN..BLUR_MAX) */
  blurRadius: number
}

// ── Security minimums (Appendix C) ──

/** Minimum blur radius to prevent reversibility */
export const BLUR_MIN = 40
/** Default blur radius */
export const BLUR_DEFAULT = 40
/** Maximum blur radius */
export const BLUR_MAX = 50

/** Minimum pixelation block size to prevent reversibility */
export const PIXELATE_MIN = 12
/** Default pixelation block size */
export const PIXELATE_DEFAULT = 16
/** Maximum pixelation block size */
export const PIXELATE_MAX = 32

/** Default solid redaction color */
export const SOLID_DEFAULT_COLOR = "#000000"

/** Clamp a blur radius to the allowed range */
export function clampBlurRadius(radius: number): number {
  return Math.max(BLUR_MIN, Math.min(BLUR_MAX, radius))
}

/** Clamp a pixelation block size to the allowed range */
export function clampBlockSize(size: number): number {
  return Math.max(PIXELATE_MIN, Math.min(PIXELATE_MAX, size))
}
