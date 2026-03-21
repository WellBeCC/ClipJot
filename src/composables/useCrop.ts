import { ref } from "vue"
import type { Ref } from "vue"
import { invoke } from "@tauri-apps/api/core"
import type { CropBounds } from "../types/crop"

export interface CropState {
  /** Current crop bounds (null = uncropped, full image visible) */
  cropBounds: Ref<CropBounds | null>
  /** Suggested trim bounds from auto-detection (null = no suggestion) */
  trimSuggestion: Ref<CropBounds | null>
  /** Whether the trim overlay is showing */
  showTrimOverlay: Ref<boolean>
}

/**
 * Create per-tab crop state.
 * Manages crop bounds, trim suggestion, and overlay visibility.
 */
export function createCropState(): CropState {
  return {
    cropBounds: ref(null),
    trimSuggestion: ref(null),
    showTrimOverlay: ref(false),
  }
}

/**
 * Detect trim bounds by invoking the Rust backend.
 * Sends raw RGBA pixel data to `detect_trim` and converts
 * edge insets to a CropBounds rectangle.
 *
 * Returns suggested crop bounds, or null if no border detected.
 *
 * Note: Passing large arrays via JSON serialization is slow for
 * high-resolution images. Subsampling optimization can be added later.
 */
export async function detectTrimBounds(
  imageData: ImageData,
  threshold = 10,
): Promise<CropBounds | null> {
  try {
    const rgba = new Uint8Array(imageData.data.buffer)
    const result = await invoke<{
      top: number
      right: number
      bottom: number
      left: number
    }>("detect_trim", {
      imageBytes: Array.from(rgba),
      width: imageData.width,
      height: imageData.height,
      threshold,
    })

    // If no trim needed (all edges zero), return null
    if (
      result.top === 0 &&
      result.right === 0 &&
      result.bottom === 0 &&
      result.left === 0
    ) {
      return null
    }

    return {
      x: result.left,
      y: result.top,
      width: imageData.width - result.left - result.right,
      height: imageData.height - result.top - result.bottom,
    }
  } catch (err) {
    console.error("Auto-trim detection failed:", err)
    return null
  }
}
