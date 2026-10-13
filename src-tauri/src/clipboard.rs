//! Image clipboard writes.
//!
//! On macOS the clipboard-manager plugin (arboard) writes an `NSImage` object,
//! whose TIFF data is provided lazily. Clipboard history apps such as Paste
//! don't register that as a new clip, even though pasting works. We write
//! PNG + TIFF bytes to the pasteboard directly instead. Other platforms keep
//! using the plugin.

use tauri::ipc::{InvokeBody, Request};

/// Write raw, non-premultiplied RGBA pixels to the system clipboard.
///
/// The pixels arrive as the raw IPC body (no JSON array conversion); the
/// dimensions come in the `x-width` / `x-height` headers.
#[tauri::command]
pub fn write_clipboard_image(app: tauri::AppHandle, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(rgba) = request.body() else {
        return Err("Expected raw RGBA body".into());
    };
    let width = header_u32(&request, "x-width")?;
    let height = header_u32(&request, "x-height")?;

    let expected = width as usize * height as usize * 4;
    if rgba.len() != expected {
        return Err(format!(
            "RGBA length {} does not match {}x{} image",
            rgba.len(),
            width,
            height
        ));
    }

    write_image(&app, rgba, width, height)
}

fn header_u32(request: &Request<'_>, name: &str) -> Result<u32, String> {
    request
        .headers()
        .get(name)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
        .ok_or_else(|| format!("Missing or invalid {} header", name))
}

#[cfg(target_os = "macos")]
fn write_image(_app: &tauri::AppHandle, rgba: &[u8], width: u32, height: u32) -> Result<(), String> {
    use objc2::AllocAnyThread;
    use objc2_app_kit::{
        NSBitmapFormat, NSBitmapImageFileType, NSBitmapImageRep, NSDeviceRGBColorSpace,
        NSPasteboard, NSPasteboardTypePNG, NSPasteboardTypeTIFF,
    };
    use objc2_foundation::{NSArray, NSDictionary};

    // NSBitmapImageRep reads from the planes pointer without copying, so keep
    // our own buffer alive until both encodings are done.
    let mut pixels = rgba.to_vec();
    let mut planes = [pixels.as_mut_ptr()];

    let (png, tiff) = unsafe {
        let rep = NSBitmapImageRep::initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bitmapFormat_bytesPerRow_bitsPerPixel(
            NSBitmapImageRep::alloc(),
            planes.as_mut_ptr(),
            width as isize,
            height as isize,
            8,
            4,
            true,
            false,
            NSDeviceRGBColorSpace,
            // Canvas getImageData returns straight (non-premultiplied) alpha
            NSBitmapFormat::AlphaNonpremultiplied,
            width as isize * 4,
            32,
        )
        .ok_or("Failed to create bitmap image rep")?;
        let png = rep
            .representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())
            .ok_or("Failed to encode clipboard image as PNG")?;
        let tiff = rep
            .TIFFRepresentation()
            .ok_or("Failed to encode clipboard image as TIFF")?;
        (png, tiff)
    };
    drop(pixels);

    // PNG first: it's what most apps (messengers, browsers) prefer and is far
    // smaller than TIFF. TIFF stays for apps that only read that.
    let (png_type, tiff_type) = unsafe { (NSPasteboardTypePNG, NSPasteboardTypeTIFF) };
    let pasteboard = NSPasteboard::generalPasteboard();
    unsafe {
        pasteboard.declareTypes_owner(&NSArray::from_slice(&[png_type, tiff_type]), None);
    }
    if pasteboard.setData_forType(Some(&png), png_type)
        && pasteboard.setData_forType(Some(&tiff), tiff_type)
    {
        Ok(())
    } else {
        Err("Failed to write image to the pasteboard".into())
    }
}

#[cfg(not(target_os = "macos"))]
fn write_image(app: &tauri::AppHandle, rgba: &[u8], width: u32, height: u32) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let image = tauri::image::Image::new(rgba, width, height);
    app.clipboard().write_image(&image).map_err(|e| e.to_string())
}
