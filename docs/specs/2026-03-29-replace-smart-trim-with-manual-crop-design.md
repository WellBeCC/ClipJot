# Replace Smart Trim with Manual Crop Tool

**Date:** 2026-03-29
**Status:** Approved

## Overview

Remove the Smart trim feature (auto-detection of uniform borders) and replace it
with a manual crop tool in the main toolbar. The crop tool uses a resizable frame
with aspect ratio presets, and Apply/Cancel controls in the sub-toolbar.

## Removal Scope

Delete entirely:

- `src/components/TrimOverlay.vue` — smart trim suggestion overlay
- `src-tauri/src/trim.rs` — Rust border detection algorithm
- `detect_trim` command registration in `src-tauri/src/lib.rs`
- `detectTrimBounds()` function in `src/composables/useCrop.ts`
- `trimSuggestion` and `showTrimOverlay` refs from `CropState` interface
- Settings: `autoTrimOnPaste` toggle, `trimThreshold` slider, and their state in
  `src/composables/useSettings.ts`
- Settings UI: "Auto-trim on paste" checkbox and "Trim threshold" slider in
  `src/components/SettingsDialog.vue`
- "Smart trim" `ActionButton` (Scissors icon) in `Toolbar.vue`
- `trim` emit from `Toolbar.vue`
- Any `handleTrim()` handler in `AppShell.vue`

Keep and enhance:

- `src/components/CropOverlay.vue` — drag-to-draw, 8-directional handles, dim
  regions, keyboard shortcuts
- `src/commands/CropCommand.ts` — undo/redo for crop operations
- `src/types/crop.ts` — `CropBounds` type
- `cropBounds` ref in `CropState`
- `"crop"` ToolId

## Crop Tool in Toolbar

Add `"crop"` to the toolbar's `tools` array as a dedicated drawing tool (not an
action button):

```
{ id: "crop", icon: Crop, label: "Crop (P)" }
```

- Uses `Crop` icon from `lucide-vue-next`
- Keyboard shortcut: `P` activates crop mode
- When active, `CropOverlay.vue` mounts over the canvas (already conditional on
  `activeTool === "crop"`)

## Aspect Ratio Presets

When crop tool is active, a sub-toolbar appears with aspect ratio presets:

| Preset     | Behavior                              |
| ---------- | ------------------------------------- |
| Free       | No constraint (default)               |
| Original   | Matches source image's aspect ratio   |
| 16:9       | Landscape widescreen                  |
| 4:3        | Classic display ratio                 |
| 1:1        | Square                                |

Displayed as a horizontal row of small toggle buttons. Active preset is visually
highlighted.

### Constraint behavior

- **Drawing a new region:** aspect ratio is enforced during drag. Width is
  determined by horizontal mouse movement; height is computed from the ratio.
- **Resizing via corner handles:** ratio is enforced proportionally.
- **Edge handles:** disabled (not rendered) when a ratio is locked. Only corner
  handles are available under a locked ratio.
- **Switching presets with a pending region:** the existing region re-adjusts to
  the new ratio, centered within its current bounds, shrinking the larger
  dimension to fit.

### Type changes

`"crop"` moves out of `NoSettingsToolId`. New settings type:

```typescript
export type AspectRatioPreset = "free" | "original" | "16:9" | "4:3" | "1:1"

export interface CropToolSettings {
  aspectRatio: AspectRatioPreset
}
```

Tool store gets `getCropSettings()` / `updateCropSettings()` following the
existing pattern for other tool settings.

## Apply / Cancel Controls

When the crop tool is active **and** a pending crop region exists, the
sub-toolbar shows two additional buttons alongside the aspect ratio presets:

| Button | Icon       | Action                                        |
| ------ | ---------- | --------------------------------------------- |
| Apply  | Check      | Commits the crop (same as Enter key)           |
| Cancel | X          | Discards the pending region (same as Escape)   |

These buttons are hidden when there's no pending region.

The floating "Crop" button currently centered inside the selection area
(`CropOverlay.vue` lines 365-374) is removed.

## CropOverlay Refactoring

`CropOverlay.vue` becomes a pure UI component. Instead of creating and pushing
`CropCommand` internally, it communicates via emits:

| Emit              | Payload              | When                                |
| ----------------- | -------------------- | ----------------------------------- |
| `confirm`         | `CropBounds`         | User presses Enter or clicks Apply  |
| `cancel`          | none                 | User presses Escape or clicks Cancel|
| `update:pending`  | `CropBounds \| null` | Pending region changes              |

The parent component (`CanvasViewport` or `AppShell`) handles:

- Creating and pushing `CropCommand` on confirm
- Passing aspect ratio constraint as a prop
- Tracking pending state for toolbar button visibility

### Props added

| Prop           | Type                   | Purpose                                |
| -------------- | ---------------------- | -------------------------------------- |
| `aspectRatio`  | `AspectRatioPreset`    | Current ratio constraint               |

### Props kept

| Prop             | Type                                              | Purpose                        |
| ---------------- | ------------------------------------------------- | ------------------------------ |
| `imageWidth`     | `number`                                          | Image dimensions for clamping  |
| `imageHeight`    | `number`                                          | Image dimensions for clamping  |
| `screenToImage`  | `(sx: number, sy: number) => { x: number; y: number }` | Coordinate conversion    |

### Props removed

| Prop            | Reason                                         |
| --------------- | ---------------------------------------------- |
| `cropBounds`    | No longer needed — overlay doesn't push commands |
| `undoRedoPush`  | No longer needed — parent handles commands      |

## Keyboard Shortcuts

| Key    | Action                          |
| ------ | ------------------------------- |
| P      | Activate crop tool              |
| Enter  | Apply pending crop              |
| Escape | Cancel pending crop             |

## Test Updates

- Remove tests related to `detectTrimBounds` in `test/crop.test.ts`
- Update remaining crop tests to reflect the emit-based API
- Add tests for aspect ratio constraint logic (ratio enforcement during draw and
  resize, preset switching with pending region)
