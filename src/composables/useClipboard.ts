import { readImage, writeImage } from "@tauri-apps/plugin-clipboard-manager"
import { Image } from "@tauri-apps/api/image"

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
  console.log("[ClipJot] readClipboardImage: starting...")
  try {
    console.log("[ClipJot] readClipboardImage: calling readImage()...")
    const image = await readImage()
    console.log("[ClipJot] readClipboardImage: readImage() returned:", image)
    console.log("[ClipJot] readClipboardImage: type:", typeof image, "keys:", image ? Object.keys(image) : "null")

    console.log("[ClipJot] readClipboardImage: calling rgba()...")
    const rgba = await image.rgba()
    console.log("[ClipJot] readClipboardImage: rgba() returned, length:", rgba?.length)

    console.log("[ClipJot] readClipboardImage: calling size()...")
    const size = await image.size()
    console.log("[ClipJot] readClipboardImage: size() returned:", size)
    const { width, height } = size

    console.log("[ClipJot] readClipboardImage: dimensions:", width, "x", height, "rgba bytes:", rgba?.length)

    if (!width || !height) {
      console.warn("[ClipJot] readClipboardImage: zero dimensions, aborting")
      return null
    }

    // Convert RGBA Uint8Array to displayable blob URL via OffscreenCanvas
    console.log("[ClipJot] readClipboardImage: creating OffscreenCanvas...")
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext("2d")!
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height)
    ctx.putImageData(imageData, 0, 0)
    console.log("[ClipJot] readClipboardImage: converting to blob...")
    const blob = await canvas.convertToBlob({ type: "image/png" })
    console.log("[ClipJot] readClipboardImage: blob size:", blob.size)
    const url = URL.createObjectURL(blob)
    console.log("[ClipJot] readClipboardImage: blob URL:", url)

    return { url, width, height }
  } catch (err) {
    console.error("[ClipJot] readClipboardImage: FAILED at step:", err)
    console.error("[ClipJot] readClipboardImage: error type:", typeof err)
    if (err instanceof Error) {
      console.error("[ClipJot] readClipboardImage: message:", err.message)
      console.error("[ClipJot] readClipboardImage: stack:", err.stack)
    }
    return null
  }
}

/**
 * Write image data to the clipboard.
 * Accepts raw RGBA Uint8Array with dimensions.
 */
export async function writeClipboardImage(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<void> {
  const image = await Image.new(rgba, width, height)
  await writeImage(image)
}
