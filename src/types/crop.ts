/**
 * Crop-as-projection bounds.
 * Defines a viewport rectangle within the original image.
 * All layers are rendered within this viewport; no layer data is modified.
 */
export interface CropBounds {
  /** X offset from the left edge of the original image (px) */
  x: number
  /** Y offset from the top edge of the original image (px) */
  y: number
  /** Width of the cropped viewport (px) */
  width: number
  /** Height of the cropped viewport (px) */
  height: number
}
