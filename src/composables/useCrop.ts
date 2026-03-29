import { ref } from "vue"
import type { Ref } from "vue"
import type { CropBounds } from "../types/crop"

export interface CropState {
  /** Current crop bounds (null = uncropped, full image visible) */
  cropBounds: Ref<CropBounds | null>
}

/**
 * Create per-tab crop state.
 * Manages crop bounds for the active image.
 */
export function createCropState(): CropState {
  return {
    cropBounds: ref(null),
  }
}
