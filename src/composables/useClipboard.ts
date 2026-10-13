import { readImage } from "@tauri-apps/plugin-clipboard-manager"
import { invoke } from "@tauri-apps/api/core"

export interface ClipboardImage {
  url: string
  width: number
  height: number
}

/**
 * Read the current clipboard image.
 * Returns a blob URL for display plus dimensions, or null if no image.
 */
export async function readClipboardImage(): Promise<ClipboardImage | null> {
  try {
    const image = await readImage()
    const rgba = await image.rgba()
    const { width, height } = await image.size()

    if (!width || !height) {
      return null
    }

    // Convert RGBA Uint8Array to displayable blob URL via OffscreenCanvas
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext("2d")!
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height)
    ctx.putImageData(imageData, 0, 0)

    // Use lossy WebP for faster encoding than PNG on large images.
    // The blob is only used for display; exports re-flatten from source.
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.92 })
    const url = URL.createObjectURL(blob)

    // The OffscreenCanvas dimensions match the RGBA buffer exactly,
    // so width/height from Tauri are the true pixel dimensions.
    return { url, width, height }
  } catch (err) {
    console.warn("[ClipJot] Clipboard read failed:", err)
    return null
  }
}

/**
 * Write image data to the clipboard.
 * Accepts raw RGBA Uint8Array with dimensions.
 *
 * Uses the app's own `write_clipboard_image` command instead of the plugin's
 * writeImage: on macOS the plugin writes a lazily provided NSImage, which
 * clipboard history apps (e.g. Paste) don't register as a new clip.
 * The pixels are sent as the raw IPC body; dimensions go in headers.
 */
export async function writeClipboardImage(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<void> {
  await invoke("write_clipboard_image", rgba, {
    headers: { "x-width": String(width), "x-height": String(height) },
  })
}
