# Show in System Tray — Design Spec

Date: 2026-04-07

## Overview

Add a "Show in system tray" setting (default ON) that controls whether the app
hides to the system tray when the main window is closed, or behaves as a
traditional dock-resident app.

## Behavior

| Setting  | Window open    | Window closed         | Tray icon | Dock icon      |
|----------|----------------|-----------------------|-----------|----------------|
| Tray ON  | Regular policy | hide + Accessory      | visible   | hidden         |
| Tray OFF | Regular policy | hide only             | hidden    | always visible |

- In both modes, closing the window hides it rather than destroying it.
- Quit via main menu or dock context menu fully exits in both modes.
- When tray is ON and the window is re-opened via the tray icon, the activation
  policy is restored to Regular before showing the window so the dock icon
  reappears.

## Rust backend (`src-tauri/src/lib.rs`)

### AppState struct

Add a new managed state struct alongside the existing `DynamicMenuItems`:

```rust
struct AppState {
    show_in_tray: Arc<Mutex<bool>>,           // true = tray mode (default)
    tray_icon: Arc<Mutex<Option<TrayIcon<Wry>>>>,
}
```

Both fields use `Arc<Mutex>` so they are accessible from the `on_window_event`
closure (which runs on a different thread) and from Tauri commands.

### `set_tray_mode` command

New Tauri command: `set_tray_mode(enabled: bool)`.

- Updates `AppState::show_in_tray`.
- If `enabled`: calls `tray.set_visible(true)` and (macOS) sets activation
  policy to `Regular`.
- If `!enabled`: calls `tray.set_visible(false)` and (macOS) sets activation
  policy to `Regular` (dock icon always visible when tray is off).

### `on_window_event` handler (CloseRequested)

Reads `show_in_tray` from `AppState`:

- If `true`: calls `window.hide()`, prevents close, and (macOS) sets activation
  policy to `Accessory` so the dock icon disappears.
- If `false`: calls `window.hide()`, prevents close, leaves activation policy
  as `Regular` so the dock icon remains.

### Tray "Show ClipJot" handler

Before calling `window.show()` and `window.set_focus()`, (macOS) sets
activation policy to `Regular` so the dock icon reappears.

### Activation policy note

`app_handle.set_activation_policy(ActivationPolicy::...)` is macOS-only. All
calls are gated with `#[cfg(target_os = "macos")]`.

## Frontend

### `useSettings.ts`

- Add `showInTray` reactive ref: `ref<boolean>(loadFromStorage("showInTray", true))`.
- Add `setShowInTray(value: boolean)` updater.
- Add a watcher that calls `invoke("set_tray_mode", { enabled: value })` on
  every change.
- Export `showInTray` and `setShowInTray` from `useSettings()`.

### `SettingsDialog.vue`

Add a toggle in the System section, after "Launch at login":

```
Show in system tray   [checkbox]
```

Uses the same `settings-field--toggle` pattern as existing checkboxes.

### App startup sync

In `App.vue` (or whichever component initialises the app), call
`invoke("set_tray_mode", { enabled: showInTray.value })` once on `onMounted`
to sync the persisted setting into Rust state before any window events fire.

## Testing

- Unit test `useSettings` for `showInTray` default value, persistence, and
  `setShowInTray` updater.
- Manual verification of each row in the behavior matrix above on macOS.
- Verify quit paths (main menu Quit, dock context menu Quit) work in both modes.
