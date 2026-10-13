import { describe, test, expect } from "bun:test"
import { readFileSync } from "fs"
import { resolve } from "path"

// On macOS the clipboard plugin (arboard) only puts TIFF on the clipboard.
// Clipboard writes go through the app's own write_clipboard_image command,
// which adds PNG on macOS and uses the plugin elsewhere.

const clipboardTs = readFileSync(
  resolve(__dirname, "../src/composables/useClipboard.ts"),
  "utf-8",
)
const clipboardRs = readFileSync(
  resolve(__dirname, "../src-tauri/src/clipboard.rs"),
  "utf-8",
)
const libRs = readFileSync(
  resolve(__dirname, "../src-tauri/src/lib.rs"),
  "utf-8",
)

describe("Clipboard image write", () => {
  const writeFn = clipboardTs.slice(
    clipboardTs.indexOf("export async function writeClipboardImage"),
  )

  test("frontend uses the app command, not the plugin's writeImage", () => {
    expect(clipboardTs).not.toContain("writeImage }")
    expect(clipboardTs).not.toContain("writeImage(")
    expect(writeFn).toContain('invoke("write_clipboard_image", rgba,')
  })

  test("pixels go as raw IPC body with dimensions in headers", () => {
    expect(writeFn).toContain('"x-width": String(width)')
    expect(writeFn).toContain('"x-height": String(height)')
    expect(clipboardRs).toContain("InvokeBody::Raw(rgba)")
    expect(clipboardRs).toContain('header_u32(&request, "x-width")')
    expect(clipboardRs).toContain('header_u32(&request, "x-height")')
  })

  test("command is registered with the invoke handler", () => {
    expect(libRs).toContain("mod clipboard;")
    expect(libRs).toContain("clipboard::write_clipboard_image")
  })

  test("macOS writes PNG + TIFF bytes directly to the pasteboard", () => {
    expect(clipboardRs).toContain('#[cfg(target_os = "macos")]')
    expect(clipboardRs).toContain("NSBitmapImageFileType::PNG")
    expect(clipboardRs).toContain(".TIFFRepresentation()")
    expect(clipboardRs).toContain("&[png_type, tiff_type]")
    expect(clipboardRs).toContain("setData_forType(Some(&png), png_type)")
    expect(clipboardRs).toContain("setData_forType(Some(&tiff), tiff_type)")
    // Canvas getImageData yields straight alpha
    expect(clipboardRs).toContain("NSBitmapFormat::AlphaNonpremultiplied")
  })

  test("other platforms keep using the clipboard plugin", () => {
    expect(clipboardRs).toContain('#[cfg(not(target_os = "macos"))]')
    expect(clipboardRs).toContain("app.clipboard().write_image(&image)")
  })

  test("rejects RGBA buffers that don't match the dimensions", () => {
    expect(clipboardRs).toContain("width as usize * height as usize * 4")
  })
})
