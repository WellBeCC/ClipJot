//! Image clipboard writes.
//!
//! Wraps the clipboard-manager plugin (arboard) so the frontend can send RGBA
//! pixels as a raw IPC body. The plugin's own JS `Image.new` sends them inside
//! a JSON payload, which is slow for large images.
//!
//! Formats arboard writes: macOS – TIFF (via NSImage); Windows – PNG + CF_DIBV5;
//! Linux – image/png. Apps that want PNG on macOS (e.g. Slack) convert it.

use tauri::ipc::{InvokeBody, Request};
use tauri_plugin_clipboard_manager::ClipboardExt;

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

    let image = tauri::image::Image::new(rgba, width, height);
    app.clipboard().write_image(&image).map_err(|e| e.to_string())
}

fn header_u32(request: &Request<'_>, name: &str) -> Result<u32, String> {
    request
        .headers()
        .get(name)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
        .ok_or_else(|| format!("Missing or invalid {} header", name))
}
