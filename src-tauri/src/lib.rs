mod trim;

use trim::TrimBounds;

#[tauri::command]
async fn detect_trim(
    image_bytes: Vec<u8>,
    width: u32,
    height: u32,
    threshold: u8,
) -> Result<TrimBounds, String> {
    // Validate dimensions
    if width == 0 || height == 0 {
        return Err("Image dimensions must be non-zero".to_string());
    }

    if width > 32768 || height > 32768 {
        return Err("Image dimensions exceed maximum (32768×32768)".to_string());
    }

    // Validate buffer size
    let expected = (width as usize) * (height as usize) * 4;
    if image_bytes.len() != expected {
        return Err(format!(
            "Buffer size mismatch: expected {} bytes ({}×{}×4), got {}",
            expected,
            width,
            height,
            image_bytes.len()
        ));
    }

    // Run CPU-bound work on blocking thread
    tauri::async_runtime::spawn_blocking(move || {
        trim::detect_trim_bounds(&image_bytes, width, height, threshold)
    })
    .await
    .map_err(|e| format!("Trim detection failed: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![detect_trim])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
