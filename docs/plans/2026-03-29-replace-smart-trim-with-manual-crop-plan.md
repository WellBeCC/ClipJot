# Replace Smart Trim with Manual Crop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Smart trim feature and replace it with a manual crop tool in the toolbar, with aspect ratio presets and Apply/Cancel controls in the sub-toolbar.

**Architecture:** Refactor existing `CropOverlay.vue` into a pure UI component that emits events instead of handling commands internally. Add crop as a toolbar tool with a sub-toolbar for aspect ratio presets and confirm/cancel actions. Remove all Rust-side trim detection, trim overlay, and auto-trim settings.

**Tech Stack:** Vue 3, TypeScript, Tauri v2 (Rust), Bun test runner

**Spec:** `docs/specs/2026-03-29-replace-smart-trim-with-manual-crop-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Delete | `src/components/TrimOverlay.vue` | Smart trim suggestion overlay |
| Delete | `src-tauri/src/trim.rs` | Rust border detection algorithm |
| Modify | `src-tauri/src/lib.rs` | Remove `mod trim`, `detect_trim` command |
| Modify | `src/composables/useCrop.ts` | Remove `detectTrimBounds`, trim refs from `CropState` |
| Modify | `src/composables/useSettings.ts` | Remove `autoTrimOnPaste`, `trimThreshold` |
| Modify | `src/components/SettingsDialog.vue` | Remove trim settings UI |
| Modify | `src/components/Toolbar.vue` | Remove trim button, add crop tool |
| Modify | `src/components/AppShell.vue` | Remove `handleTrim`, `@trim` binding |
| Modify | `src/types/tools.ts` | Add `CropToolSettings`, `AspectRatioPreset`; update `NoSettingsToolId` |
| Modify | `src/composables/useToolStore.ts` | Add crop settings state + accessors |
| Modify | `src/composables/useKeyboard.ts` | Map `p` to `crop`, remove from `pen`; update escape handler |
| Modify | `src/components/CropOverlay.vue` | Emit-based API, aspect ratio enforcement |
| Modify | `src/components/CanvasViewport.vue` | Handle crop emits, pass aspect ratio prop |
| Modify | `src/components/SubToolbar.vue` | Add crop sub-toolbar (ratio presets, apply/cancel) |
| Create | `src/components/AspectRatioSelector.vue` | Aspect ratio preset toggle buttons |
| Modify | `src-tauri/src/lib.rs` | Add `crop` to Tools menu |
| Modify | `test/crop.test.ts` | Remove trim tests, add aspect ratio tests |

---

### Task 1: Remove Rust trim backend

**Files:**
- Delete: `src-tauri/src/trim.rs`
- Modify: `src-tauri/src/lib.rs:1-7,10-43,67`

- [ ] **Step 1: Delete `trim.rs`**

```bash
rm src-tauri/src/trim.rs
```

- [ ] **Step 2: Remove trim references from `lib.rs`**

Remove the `mod trim;` declaration (line 1), the `use trim::TrimBounds;` import (line 7), the entire `detect_trim` async function (lines 9-43), and remove `detect_trim` from the `generate_handler!` macro (line 67).

In `src-tauri/src/lib.rs`, change:

```rust
mod trim;
```
to nothing (delete the line).

Delete:
```rust
use trim::TrimBounds;
```

Delete the entire `detect_trim` function (lines 9-43).

Change:
```rust
        .invoke_handler(tauri::generate_handler![detect_trim, write_file])
```
to:
```rust
        .invoke_handler(tauri::generate_handler![write_file])
```

- [ ] **Step 3: Add Crop to the Rust Tools menu**

In `src-tauri/src/lib.rs`, after the `tool_redact` menu item (line 149), add:

```rust
                let tool_crop = MenuItemBuilder::with_id("crop", "Crop").build(app)?;
```

And add `&tool_crop` to the tools menu builder after `&tool_redact`:

```rust
                let tools_menu = SubmenuBuilder::new(app, "Tools")
                    .item(&tool_select)
                    .separator()
                    .item(&tool_pen)
                    .item(&tool_pencil)
                    .item(&tool_marker)
                    .item(&tool_eraser)
                    .separator()
                    .item(&tool_arrow)
                    .item(&tool_line)
                    .item(&tool_rect)
                    .item(&tool_ellipse)
                    .separator()
                    .item(&tool_callout)
                    .item(&tool_text)
                    .item(&tool_redact)
                    .item(&tool_crop)
                    .build()?;
```

- [ ] **Step 4: Verify Rust compiles**

```bash
cd src-tauri && cargo check
```

Expected: compilation succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A src-tauri/
git commit -m "Remove Rust trim backend, add crop to Tools menu"
```

---

### Task 2: Remove trim from frontend settings and composables

**Files:**
- Modify: `src/composables/useSettings.ts:28-29,42-43,95-101,119-145`
- Modify: `src/composables/useCrop.ts:1-75`
- Modify: `src/composables/useKeyboard.ts:270-277`

- [ ] **Step 1: Remove trim state from `useSettings.ts`**

In `src/composables/useSettings.ts`:

Delete line 28:
```typescript
const autoTrimOnPaste = ref<boolean>(loadFromStorage<boolean>("autoTrimOnPaste", true))
```

Delete line 29:
```typescript
const trimThreshold = ref<number>(loadFromStorage<number>("trimThreshold", 10))
```

Delete the watchers (lines 42-43):
```typescript
watch(autoTrimOnPaste, (v) => saveToStorage("autoTrimOnPaste", v))
watch(trimThreshold, (v) => saveToStorage("trimThreshold", v))
```

Delete the setter functions (lines 95-101):
```typescript
function setAutoTrimOnPaste(value: boolean): void {
  autoTrimOnPaste.value = value
}

function setTrimThreshold(value: number): void {
  trimThreshold.value = Math.max(0, Math.min(50, value))
}
```

Remove `autoTrimOnPaste`, `trimThreshold`, `setAutoTrimOnPaste`, `setTrimThreshold` from the returned object in `useSettings()`.

- [ ] **Step 2: Simplify `useCrop.ts` — remove trim detection and trim state**

Replace the entire content of `src/composables/useCrop.ts` with:

```typescript
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
```

- [ ] **Step 3: Update escape handler in `useKeyboard.ts`**

In `src/composables/useKeyboard.ts`, the `handleEscape` function references `tab.cropState.showTrimOverlay`. Replace the crop branch (lines 271-277):

```typescript
      // If crop tool is active, cancel crop and switch to select
      if (activeTool.value === "crop") {
        if (tab) {
          tab.cropState.cropBounds.value = null
          tab.cropState.showTrimOverlay.value = false
        }
        setTool("select")
        return
      }
```

with:

```typescript
      // If crop tool is active, switch to select (CropOverlay handles its own Escape)
      if (activeTool.value === "crop") {
        setTool("select")
        return
      }
```

- [ ] **Step 4: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: may show errors in files not yet updated (SettingsDialog, tests) — those are addressed in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useSettings.ts src/composables/useCrop.ts src/composables/useKeyboard.ts
git commit -m "Remove trim state from settings and crop composables"
```

---

### Task 3: Remove trim UI from Settings and Toolbar

**Files:**
- Modify: `src/components/SettingsDialog.vue:10-26,33-36,129-156`
- Modify: `src/components/Toolbar.vue:24,58-67,119-123`
- Modify: `src/components/AppShell.vue:114-116,134`
- Delete: `src/components/TrimOverlay.vue`

- [ ] **Step 1: Clean up `SettingsDialog.vue`**

In `src/components/SettingsDialog.vue`, remove trim-related imports from the destructured `useSettings()` call (lines 12-13, 20-21):

Remove `autoTrimOnPaste,` and `trimThreshold,` from reactive state destructuring.
Remove `setAutoTrimOnPaste,` and `setTrimThreshold,` from update functions destructuring.

Delete the `handleTrimThreshold` function (lines 33-36):
```typescript
function handleTrimThreshold(event: Event): void {
  const target = event.target as HTMLInputElement
  setTrimThreshold(Number(target.value))
}
```

Delete the "Auto-trim on paste" checkbox (lines 129-137):
```html
          <label class="settings-field settings-field--toggle">
            <span class="settings-field__label">Auto-trim on paste</span>
            <input
              type="checkbox"
              class="settings-field__checkbox"
              :checked="autoTrimOnPaste"
              @change="setAutoTrimOnPaste(!autoTrimOnPaste)"
            />
          </label>
```

Delete the "Trim threshold" slider (lines 144-156):
```html
          <label class="settings-field">
            <span class="settings-field__label"
              >Trim threshold ({{ trimThreshold }})</span
            >
            <input
              type="range"
              class="settings-field__slider"
              min="0"
              max="50"
              :value="trimThreshold"
              @input="handleTrimThreshold"
            />
          </label>
```

- [ ] **Step 2: Remove trim button and emit from `Toolbar.vue`**

In `src/components/Toolbar.vue`:

Remove the `Scissors` import from the lucide imports (line 24).

Remove `trim: [];` from the `defineEmits` type (line 63).

Delete the Smart trim ActionButton (lines 119-123):
```html
      <ActionButton
        :icon="Scissors"
        label="Smart trim"
        @click="emit('trim')"
      />
```

- [ ] **Step 3: Remove trim handler from `AppShell.vue`**

In `src/components/AppShell.vue`:

Delete the `handleTrim` function (lines 114-116):
```typescript
function handleTrim(): void {
  // TODO: invoke auto-trim detection and show overlay
}
```

Remove `@trim="handleTrim"` from the `<Toolbar>` component (line 134).

- [ ] **Step 4: Delete `TrimOverlay.vue`**

```bash
rm src/components/TrimOverlay.vue
```

- [ ] **Step 5: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: should pass (or only show errors in test file, addressed next).

- [ ] **Step 6: Commit**

```bash
git add -A src/components/ src/components/SettingsDialog.vue src/components/AppShell.vue
git commit -m "Remove Smart trim UI from settings, toolbar, and app shell"
```

---

### Task 4: Update tests — remove trim tests, update crop state tests

**Files:**
- Modify: `test/crop.test.ts`

- [ ] **Step 1: Rewrite `test/crop.test.ts`**

Replace the entire file content with:

```typescript
import { describe, test, expect } from "bun:test"
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"
import { ref } from "vue"
import type { CropBounds } from "../src/types/crop"
import { createCropCommand } from "../src/commands/CropCommand"
import { createCropState } from "../src/composables/useCrop"

const srcDir = resolve(__dirname, "../src")
const typesDir = resolve(srcDir, "types")
const composablesDir = resolve(srcDir, "composables")
const commandsDir = resolve(srcDir, "commands")

describe("CropBounds Type", () => {
  test("crop.ts defines the CropBounds interface", () => {
    const content = readFileSync(resolve(typesDir, "crop.ts"), "utf-8")
    expect(content).toContain("export interface CropBounds")
    expect(content).toContain("x: number")
    expect(content).toContain("y: number")
    expect(content).toContain("width: number")
    expect(content).toContain("height: number")
  })

  test("CropBounds is importable and usable as a type", () => {
    const bounds: CropBounds = { x: 10, y: 20, width: 100, height: 200 }
    expect(bounds.x).toBe(10)
    expect(bounds.y).toBe(20)
    expect(bounds.width).toBe(100)
    expect(bounds.height).toBe(200)
  })
})

describe("CropCommand", () => {
  test("CropCommand.ts exists", () => {
    expect(existsSync(resolve(commandsDir, "CropCommand.ts"))).toBe(true)
  })

  test("CropCommand.ts exports createCropCommand", () => {
    const content = readFileSync(
      resolve(commandsDir, "CropCommand.ts"),
      "utf-8",
    )
    expect(content).toContain("export function createCropCommand")
    expect(content).toContain('layer: "crop"')
    expect(content).toContain('label: "Crop"')
  })

  test("execute sets new crop bounds on the ref", () => {
    const cropRef = ref<CropBounds | null>(null)
    const newBounds: CropBounds = { x: 5, y: 10, width: 200, height: 150 }
    const cmd = createCropCommand(null, newBounds, cropRef)

    cmd.execute()
    expect(cropRef.value).toEqual(newBounds)
  })

  test("undo restores previous crop bounds", () => {
    const previous: CropBounds = { x: 0, y: 0, width: 800, height: 600 }
    const cropRef = ref<CropBounds | null>(previous)
    const newBounds: CropBounds = { x: 10, y: 10, width: 780, height: 580 }
    const cmd = createCropCommand(previous, newBounds, cropRef)

    cmd.execute()
    expect(cropRef.value).toEqual(newBounds)

    cmd.undo()
    expect(cropRef.value).toEqual(previous)
  })

  test("undo restores null when previous was null", () => {
    const cropRef = ref<CropBounds | null>(null)
    const newBounds: CropBounds = { x: 20, y: 20, width: 160, height: 120 }
    const cmd = createCropCommand(null, newBounds, cropRef)

    cmd.execute()
    expect(cropRef.value).not.toBeNull()

    cmd.undo()
    expect(cropRef.value).toBeNull()
  })

  test("command has unique id", () => {
    const cropRef = ref<CropBounds | null>(null)
    const bounds: CropBounds = { x: 0, y: 0, width: 100, height: 100 }
    const cmd1 = createCropCommand(null, bounds, cropRef)
    const cmd2 = createCropCommand(null, bounds, cropRef)
    expect(cmd1.id).not.toBe(cmd2.id)
  })

  test("command has correct label and layer", () => {
    const cropRef = ref<CropBounds | null>(null)
    const bounds: CropBounds = { x: 0, y: 0, width: 100, height: 100 }
    const cmd = createCropCommand(null, bounds, cropRef)
    expect(cmd.label).toBe("Crop")
    expect(cmd.layer).toBe("crop")
  })
})

describe("CropState (useCrop)", () => {
  test("useCrop.ts exists", () => {
    expect(existsSync(resolve(composablesDir, "useCrop.ts"))).toBe(true)
  })

  test("useCrop.ts exports createCropState", () => {
    const content = readFileSync(
      resolve(composablesDir, "useCrop.ts"),
      "utf-8",
    )
    expect(content).toContain("export function createCropState")
    expect(content).toContain("export interface CropState")
  })

  test("useCrop.ts does NOT contain trim references", () => {
    const content = readFileSync(
      resolve(composablesDir, "useCrop.ts"),
      "utf-8",
    )
    expect(content).not.toContain("detectTrimBounds")
    expect(content).not.toContain("trimSuggestion")
    expect(content).not.toContain("showTrimOverlay")
    expect(content).not.toContain("detect_trim")
  })

  test("createCropState returns correct structure", () => {
    const state = createCropState()
    expect(state).toHaveProperty("cropBounds")
    expect(state).not.toHaveProperty("trimSuggestion")
    expect(state).not.toHaveProperty("showTrimOverlay")
  })

  test("createCropState initializes cropBounds to null", () => {
    const state = createCropState()
    expect(state.cropBounds.value).toBeNull()
  })

  test("cropBounds ref is reactive", () => {
    const state = createCropState()
    const bounds: CropBounds = { x: 10, y: 20, width: 300, height: 200 }
    state.cropBounds.value = bounds
    expect(state.cropBounds.value).toEqual(bounds)
  })

  test("each createCropState call returns independent state", () => {
    const state1 = createCropState()
    const state2 = createCropState()
    state1.cropBounds.value = { x: 0, y: 0, width: 100, height: 100 }
    expect(state2.cropBounds.value).toBeNull()
  })
})

describe("Tab Integration", () => {
  test("tab.ts imports CropState", () => {
    const content = readFileSync(resolve(typesDir, "tab.ts"), "utf-8")
    expect(content).toContain("CropState")
    expect(content).toContain("useCrop")
  })

  test("tab.ts includes cropState in Tab interface", () => {
    const content = readFileSync(resolve(typesDir, "tab.ts"), "utf-8")
    expect(content).toContain("cropState: CropState")
  })

  test("useTabStore.ts imports createCropState", () => {
    const content = readFileSync(
      resolve(composablesDir, "useTabStore.ts"),
      "utf-8",
    )
    expect(content).toContain("createCropState")
    expect(content).toContain("useCrop")
  })
})

describe("CropCommand integrates with undo/redo", () => {
  test("CropCommand works with undo/redo stack", async () => {
    const { createUndoRedo } = await import(
      "../src/composables/useUndoRedo"
    )
    const stack = createUndoRedo()
    const cropRef = ref<CropBounds | null>(null)
    const bounds: CropBounds = { x: 10, y: 10, width: 100, height: 80 }

    const cmd = createCropCommand(null, bounds, cropRef)
    stack.push(cmd)

    expect(cropRef.value).toEqual(bounds)

    stack.undo()
    expect(cropRef.value).toBeNull()

    stack.redo()
    expect(cropRef.value).toEqual(bounds)
  })
})

describe("TrimOverlay removed", () => {
  test("TrimOverlay.vue does not exist", () => {
    expect(existsSync(resolve(__dirname, "../src/components/TrimOverlay.vue"))).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
export AGENT=1 && bun test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add test/crop.test.ts
git commit -m "Update crop tests: remove trim references, add removal assertions"
```

---

### Task 5: Add crop types and tool store settings

**Files:**
- Modify: `src/types/tools.ts:1-14,24-25,80-95`
- Modify: `src/composables/useToolStore.ts`

- [ ] **Step 1: Write failing test for crop tool settings type**

Add a new test file `test/crop-settings.test.ts`:

```typescript
import { describe, test, expect } from "bun:test"
import { readFileSync } from "fs"
import { resolve } from "path"

const typesDir = resolve(__dirname, "../src/types")
const composablesDir = resolve(__dirname, "../src/composables")

describe("AspectRatioPreset type", () => {
  test("tools.ts exports AspectRatioPreset type", () => {
    const content = readFileSync(resolve(typesDir, "tools.ts"), "utf-8")
    expect(content).toContain("export type AspectRatioPreset")
    expect(content).toContain('"free"')
    expect(content).toContain('"original"')
    expect(content).toContain('"16:9"')
    expect(content).toContain('"4:3"')
    expect(content).toContain('"1:1"')
  })

  test("tools.ts exports CropToolSettings interface", () => {
    const content = readFileSync(resolve(typesDir, "tools.ts"), "utf-8")
    expect(content).toContain("export interface CropToolSettings")
    expect(content).toContain("aspectRatio: AspectRatioPreset")
  })

  test("crop is not in NoSettingsToolId", () => {
    const content = readFileSync(resolve(typesDir, "tools.ts"), "utf-8")
    const noSettingsLine = content
      .split("\n")
      .find((l) => l.includes("NoSettingsToolId"))
    expect(noSettingsLine).toBeDefined()
    expect(noSettingsLine).not.toContain('"crop"')
  })

  test("ToolSettingsMap maps crop to CropToolSettings", () => {
    const content = readFileSync(resolve(typesDir, "tools.ts"), "utf-8")
    expect(content).toContain("crop: CropToolSettings")
  })
})

describe("Tool store crop settings", () => {
  test("useToolStore exports getCropSettings and updateCropSettings", () => {
    const content = readFileSync(
      resolve(composablesDir, "useToolStore.ts"),
      "utf-8",
    )
    expect(content).toContain("getCropSettings")
    expect(content).toContain("updateCropSettings")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
export AGENT=1 && bun test test/crop-settings.test.ts
```

Expected: FAIL — `AspectRatioPreset` and `CropToolSettings` don't exist yet.

- [ ] **Step 3: Add types to `tools.ts`**

In `src/types/tools.ts`, add after the `RedactToolSettings` interface (after line 78):

```typescript
export type AspectRatioPreset = "free" | "original" | "16:9" | "4:3" | "1:1"

/** Settings for crop tool */
export interface CropToolSettings {
  aspectRatio: AspectRatioPreset
}
```

Change `NoSettingsToolId` (line 25) from:

```typescript
export type NoSettingsToolId = "select" | "crop"
```

to:

```typescript
export type NoSettingsToolId = "select"
```

In `ToolSettingsMap` (line 94), change:

```typescript
  crop: undefined
```

to:

```typescript
  crop: CropToolSettings
```

- [ ] **Step 4: Add crop settings to `useToolStore.ts`**

In `src/composables/useToolStore.ts`, add the import of `CropToolSettings`:

```typescript
import type {
  ToolId,
  FreehandToolId,
  ShapeToolId,
  LineToolId,
  ShapeToolSettings,
  LineToolSettings,
  CalloutToolSettings,
  TextToolSettings,
  RedactToolSettings,
  CropToolSettings,
} from "../types/tools"
```

After `const redactSettings` (line 141), add:

```typescript
const cropSettings: CropToolSettings = { aspectRatio: "free" }
```

After the `updateRedactSettings` function (after line 238), add:

```typescript
/** Get current crop settings */
function getCropSettings(): CropToolSettings {
  return cropSettings
}

/** Update crop settings (partial patch) */
function updateCropSettings(patch: Partial<CropToolSettings>): void {
  if (patch.aspectRatio !== undefined) cropSettings.aspectRatio = patch.aspectRatio
  settingsVersion.value++
}
```

Add `getCropSettings` and `updateCropSettings` to the returned object of `useToolStore()`:

```typescript
  return {
    activeTool,
    setTool,
    // ... existing exports ...
    getRedactSettings,
    updateRedactSettings,
    getCropSettings,
    updateCropSettings,
    settingsVersion,
  }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
export AGENT=1 && bun test test/crop-settings.test.ts
```

Expected: PASS

- [ ] **Step 6: Run all tests**

```bash
export AGENT=1 && bun test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/types/tools.ts src/composables/useToolStore.ts test/crop-settings.test.ts
git commit -m "Add CropToolSettings type and crop settings to tool store"
```

---

### Task 6: Add crop tool to Toolbar and keyboard shortcuts

**Files:**
- Modify: `src/components/Toolbar.vue:7-28,36-49`
- Modify: `src/composables/useKeyboard.ts:9-22`

- [ ] **Step 1: Add crop to toolbar tools array**

In `src/components/Toolbar.vue`, add `Crop` to the lucide imports:

```typescript
import {
  MousePointer2,
  Pen,
  Pencil,
  Highlighter,
  Eraser,
  MoveUpRight,
  Minus,
  Square,
  Circle,
  Hash,
  Type,
  ShieldOff,
  Crop,
  Undo2,
  Redo2,
  Copy,
  Save,
  RefreshCw,
  CopyPlus,
  Settings,
} from "lucide-vue-next";
```

Add the crop tool to the `tools` array after redact:

```typescript
const tools: ToolDef[] = [
  { id: "select", icon: MousePointer2, label: "Select (1)" },
  { id: "pen", icon: Pen, label: "Pen (2)" },
  { id: "pencil", icon: Pencil, label: "Pencil (3)" },
  { id: "marker", icon: Highlighter, label: "Marker (4)" },
  { id: "eraser", icon: Eraser, label: "Eraser (5)" },
  { id: "arrow", icon: MoveUpRight, label: "Arrow (6)" },
  { id: "line", icon: Minus, label: "Line (7)" },
  { id: "rect", icon: Square, label: "Rectangle (8)" },
  { id: "ellipse", icon: Circle, label: "Ellipse (9)" },
  { id: "callout", icon: Hash, label: "Callout (0)" },
  { id: "text", icon: Type, label: "Text (T)" },
  { id: "redact", icon: ShieldOff, label: "Redact (R)" },
  { id: "crop", icon: Crop, label: "Crop (P)" },
];
```

- [ ] **Step 2: Update keyboard shortcut map**

In `src/composables/useKeyboard.ts`, change the `TOOL_KEY_MAP` to map `p` to `crop` instead of `pen`:

```typescript
export const TOOL_KEY_MAP: Record<string, ToolId> = {
  s: "select",
  i: "pencil",
  m: "marker",
  e: "eraser",
  a: "arrow",
  l: "line",
  r: "rect",
  c: "ellipse",
  o: "callout",
  t: "text",
  d: "redact",
  p: "crop",
}
```

Update the comment above it:

```typescript
/**
 * Tool selection via letter keys.
 * Selection, pencIl, Marker, Eraser, Arrow, Line,
 * Rectangle, Circle, callOut, Text, reDact, croP
 */
```

- [ ] **Step 3: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toolbar.vue src/composables/useKeyboard.ts
git commit -m "Add crop tool to toolbar and keyboard shortcut P"
```

---

### Task 7: Create AspectRatioSelector component

**Files:**
- Create: `src/components/AspectRatioSelector.vue`

- [ ] **Step 1: Create `AspectRatioSelector.vue`**

Create `src/components/AspectRatioSelector.vue` following the `RedactStylePicker.vue` pattern:

```vue
<script setup lang="ts">
import type { AspectRatioPreset } from "../types/tools"

defineProps<{
  modelValue: AspectRatioPreset
}>()

const emit = defineEmits<{
  "update:modelValue": [preset: AspectRatioPreset]
}>()

interface RatioOption {
  value: AspectRatioPreset
  label: string
}

const RATIO_OPTIONS: readonly RatioOption[] = [
  { value: "free", label: "Free" },
  { value: "original", label: "Original" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
] as const

function select(value: AspectRatioPreset): void {
  emit("update:modelValue", value)
}
</script>

<template>
  <div
    class="aspect-ratio-selector"
    role="radiogroup"
    aria-label="Aspect ratio"
  >
    <button
      v-for="option in RATIO_OPTIONS"
      :key="option.value"
      class="aspect-ratio-selector__option"
      :class="{ 'aspect-ratio-selector__option--active': modelValue === option.value }"
      :aria-label="option.label"
      :aria-checked="modelValue === option.value"
      role="radio"
      type="button"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.aspect-ratio-selector {
  display: flex;
  align-items: center;
  gap: 2px;
}

.aspect-ratio-selector__option {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.1s ease, background-color 0.1s ease, color 0.1s ease;
}

.aspect-ratio-selector__option:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.aspect-ratio-selector__option--active {
  background: var(--surface-panel);
  border-color: var(--interactive-default);
  color: var(--text-primary);
}
</style>
```

- [ ] **Step 2: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/AspectRatioSelector.vue
git commit -m "Add AspectRatioSelector component for crop sub-toolbar"
```

---

### Task 8: Add crop section to SubToolbar

**Files:**
- Modify: `src/components/SubToolbar.vue`

- [ ] **Step 1: Add crop sub-toolbar section**

In `src/components/SubToolbar.vue`:

Add imports at the top of the `<script setup>`:

```typescript
import AspectRatioSelector from "./AspectRatioSelector.vue"
import type { AspectRatioPreset } from "../types/tools"
import { Check, X } from "lucide-vue-next"
```

Add `getCropSettings` and `updateCropSettings` to the destructured `useToolStore()`:

```typescript
const {
  activeTool,
  settingsVersion,
  // ... existing ...
  getRedactSettings,
  updateRedactSettings,
  getCropSettings,
  updateCropSettings,
} = useToolStore()
```

Change the `isVisible` computed to show sub-toolbar for crop tool:

```typescript
const isVisible = computed(() => {
  const tool = activeTool.value
  if (tool === "crop") return true
  // Show when any annotation is selected (select tool)
  if (tool === "select") return selectedAnnotation.value !== null
  return true
})
```

Add computed and handler for crop:

```typescript
const showCrop = computed(() => activeTool.value === "crop")

const currentAspectRatio = computed(() => {
  void settingsVersion.value
  return getCropSettings().aspectRatio
})

function onAspectRatioChange(aspectRatio: AspectRatioPreset): void {
  updateCropSettings({ aspectRatio })
}
```

Add `cropPending` ref that `CanvasViewport` will update (via a shared reactive):

```typescript
/** Whether a crop region is pending — set by CanvasViewport via provide/inject */
const cropPending = ref(false)

function onCropApply(): void {
  window.dispatchEvent(new CustomEvent("crop-apply"))
}

function onCropCancel(): void {
  window.dispatchEvent(new CustomEvent("crop-cancel"))
}
```

Expose `cropPending` so parent can set it:

```typescript
defineExpose({ cropPending })
```

Add the crop section to the template, before the closing `</template>` of the `v-if="isVisible"` block:

```html
      <!-- Crop aspect ratio -->
      <div v-if="showCrop" class="sub-toolbar__section" data-section="cropRatio">
        <span class="sub-toolbar__label">Ratio</span>
        <AspectRatioSelector
          :model-value="currentAspectRatio"
          @update:model-value="onAspectRatioChange"
        />
      </div>

      <!-- Crop apply/cancel -->
      <div v-if="showCrop && cropPending" class="sub-toolbar__section" data-section="cropActions">
        <button
          class="sub-toolbar__action-btn sub-toolbar__action-btn--apply"
          title="Apply crop (Enter)"
          type="button"
          @click="onCropApply"
        >
          <Check :size="14" />
          <span>Apply</span>
        </button>
        <button
          class="sub-toolbar__action-btn sub-toolbar__action-btn--cancel"
          title="Cancel crop (Esc)"
          type="button"
          @click="onCropCancel"
        >
          <X :size="14" />
          <span>Cancel</span>
        </button>
      </div>
```

Add styles for the action buttons:

```css
.sub-toolbar__action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.1s ease, background-color 0.1s ease, color 0.1s ease;
}

.sub-toolbar__action-btn:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
}

.sub-toolbar__action-btn--apply {
  border-color: var(--interactive-default);
  color: var(--interactive-default);
}

.sub-toolbar__action-btn--apply:hover {
  background: var(--interactive-default);
  color: var(--text-inverse);
}

.sub-toolbar__action-btn--cancel:hover {
  border-color: var(--border-default);
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/SubToolbar.vue
git commit -m "Add crop aspect ratio and apply/cancel to sub-toolbar"
```

---

### Task 9: Refactor CropOverlay to emit-based API with aspect ratio support

**Files:**
- Modify: `src/components/CropOverlay.vue`

- [ ] **Step 1: Write failing test for aspect ratio constraint logic**

Add to `test/crop-settings.test.ts`:

```typescript
describe("Aspect ratio constraint", () => {
  test("constrainToRatio returns correct dimensions for 16:9", () => {
    // Import the function once it exists
    const { constrainToRatio } = require("../src/utils/cropRatio")
    const result = constrainToRatio(200, 200, 16 / 9)
    // Width stays, height adjusts to maintain ratio
    expect(result.width).toBe(200)
    expect(Math.round(result.height)).toBe(113) // 200 / (16/9) ≈ 112.5
  })

  test("constrainToRatio returns original dimensions for null ratio", () => {
    const { constrainToRatio } = require("../src/utils/cropRatio")
    const result = constrainToRatio(200, 150, null)
    expect(result.width).toBe(200)
    expect(result.height).toBe(150)
  })

  test("constrainToRatio handles 1:1", () => {
    const { constrainToRatio } = require("../src/utils/cropRatio")
    const result = constrainToRatio(300, 200, 1)
    expect(result.width).toBe(200)
    expect(result.height).toBe(200)
  })

  test("constrainToRatio handles 4:3", () => {
    const { constrainToRatio } = require("../src/utils/cropRatio")
    const result = constrainToRatio(400, 400, 4 / 3)
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
  })

  test("resolveAspectRatio maps presets to numeric ratios", () => {
    const { resolveAspectRatio } = require("../src/utils/cropRatio")
    expect(resolveAspectRatio("free", 800, 600)).toBeNull()
    expect(resolveAspectRatio("original", 800, 600)).toBeCloseTo(800 / 600)
    expect(resolveAspectRatio("16:9", 800, 600)).toBeCloseTo(16 / 9)
    expect(resolveAspectRatio("4:3", 800, 600)).toBeCloseTo(4 / 3)
    expect(resolveAspectRatio("1:1", 800, 600)).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
export AGENT=1 && bun test test/crop-settings.test.ts
```

Expected: FAIL — `src/utils/cropRatio` doesn't exist.

- [ ] **Step 3: Create `src/utils/cropRatio.ts`**

```typescript
import type { AspectRatioPreset } from "../types/tools"

/**
 * Resolve an aspect ratio preset to a numeric width/height ratio.
 * Returns null for "free" (no constraint).
 */
export function resolveAspectRatio(
  preset: AspectRatioPreset,
  imageWidth: number,
  imageHeight: number,
): number | null {
  switch (preset) {
    case "free":
      return null
    case "original":
      return imageWidth / imageHeight
    case "16:9":
      return 16 / 9
    case "4:3":
      return 4 / 3
    case "1:1":
      return 1
  }
}

/**
 * Constrain width/height to an aspect ratio.
 * If ratio is null, returns dimensions unchanged.
 * Shrinks the larger dimension to fit the ratio.
 */
export function constrainToRatio(
  width: number,
  height: number,
  ratio: number | null,
): { width: number; height: number } {
  if (ratio === null) return { width, height }

  const currentRatio = width / height
  if (currentRatio > ratio) {
    // Too wide — shrink width
    return { width: height * ratio, height }
  } else {
    // Too tall — shrink height
    return { width, height: width / ratio }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
export AGENT=1 && bun test test/crop-settings.test.ts
```

Expected: PASS

- [ ] **Step 5: Refactor `CropOverlay.vue` to emit-based API**

Replace the entire content of `src/components/CropOverlay.vue` with:

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import type { CropBounds } from "../types/crop"
import type { AspectRatioPreset } from "../types/tools"
import { resolveAspectRatio, constrainToRatio } from "../utils/cropRatio"

type HandleId =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"

const props = defineProps<{
  imageWidth: number
  imageHeight: number
  screenToImage: (sx: number, sy: number) => { x: number; y: number }
  aspectRatio: AspectRatioPreset
}>()

const emit = defineEmits<{
  confirm: [bounds: CropBounds]
  cancel: []
  "update:pending": [bounds: CropBounds | null]
}>()

/** The pending crop region the user is drawing/adjusting */
const pending = ref<CropBounds | null>(null)

/** Resolved numeric ratio (null = free) */
const numericRatio = computed(() =>
  resolveAspectRatio(props.aspectRatio, props.imageWidth, props.imageHeight),
)

/** Whether edge handles should be shown (disabled under locked ratio) */
const showEdgeHandles = computed(() => numericRatio.value === null)

// Emit pending updates
watch(pending, (val) => {
  emit("update:pending", val ? { ...val } : null)
})

// Re-adjust pending region when aspect ratio changes
watch(numericRatio, (ratio) => {
  if (!pending.value || ratio === null) return
  const b = pending.value
  const centerX = b.x + b.width / 2
  const centerY = b.y + b.height / 2
  const constrained = constrainToRatio(b.width, b.height, ratio)
  const newX = Math.max(0, Math.min(centerX - constrained.width / 2, props.imageWidth - constrained.width))
  const newY = Math.max(0, Math.min(centerY - constrained.height / 2, props.imageHeight - constrained.height))
  pending.value = {
    x: newX,
    y: newY,
    width: constrained.width,
    height: constrained.height,
  }
})

// ── Drag state (non-reactive, no rendering cost) ───────────────────────────

let isDragging = false
let dragType: "draw" | HandleId = "draw"
let dragOriginX = 0
let dragOriginY = 0
/** Snapshot of pending bounds at drag start (for handle resize) */
let dragStartBounds: CropBounds | null = null
/** Cached viewport element for coordinate transforms */
let viewportEl: HTMLElement | null = null
/** Ref to the root element for getBoundingClientRect */
const rootRef = ref<HTMLElement | null>(null)

// ── Coordinate conversion ──────────────────────────────────────────────────

function pointerToImage(e: PointerEvent): { x: number; y: number } | null {
  const rect = viewportEl?.getBoundingClientRect()
  if (!rect) return null
  return props.screenToImage(e.clientX - rect.left, e.clientY - rect.top)
}

// ── Draw: click-and-drag to define crop region ─────────────────────────────

const MIN_DRAG_SIZE = 5

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return

  viewportEl =
    rootRef.value?.closest<HTMLElement>(".canvas-viewport") ?? null

  const pt = pointerToImage(e)
  if (!pt) return

  isDragging = true
  dragType = "draw"
  dragOriginX = pt.x
  dragOriginY = pt.y
  dragStartBounds = null

  // Clear any existing pending region when starting a new draw
  pending.value = null
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!isDragging) return

  const pt = pointerToImage(e)
  if (!pt) return

  if (dragType === "draw") {
    const x = Math.max(0, Math.min(pt.x, props.imageWidth))
    const y = Math.max(0, Math.min(pt.y, props.imageHeight))

    let width = Math.abs(x - dragOriginX)
    let height = Math.abs(y - dragOriginY)

    // Apply aspect ratio constraint
    const ratio = numericRatio.value
    if (ratio !== null) {
      const constrained = constrainToRatio(width, height, ratio)
      width = constrained.width
      height = constrained.height
    }

    const left = x < dragOriginX ? dragOriginX - width : dragOriginX
    const top = y < dragOriginY ? dragOriginY - height : dragOriginY

    // Clamp to image bounds
    const clampedLeft = Math.max(0, Math.min(left, props.imageWidth - width))
    const clampedTop = Math.max(0, Math.min(top, props.imageHeight - height))

    pending.value = {
      x: clampedLeft,
      y: clampedTop,
      width,
      height,
    }
  } else {
    // Handle resize
    resizeWithHandle(dragType, pt)
  }
}

function onPointerUp(_e: PointerEvent): void {
  if (!isDragging) return
  isDragging = false

  // If the draw was too small, discard
  if (
    dragType === "draw" &&
    pending.value &&
    (pending.value.width < MIN_DRAG_SIZE ||
      pending.value.height < MIN_DRAG_SIZE)
  ) {
    pending.value = null
  }
}

// ── Handle resize ──────────────────────────────────────────────────────────

function onHandlePointerDown(e: PointerEvent, handle: HandleId): void {
  if (e.button !== 0) return
  e.stopPropagation()

  viewportEl =
    rootRef.value?.closest<HTMLElement>(".canvas-viewport") ?? null

  const pt = pointerToImage(e)
  if (!pt || !pending.value) return

  isDragging = true
  dragType = handle
  dragOriginX = pt.x
  dragOriginY = pt.y
  dragStartBounds = { ...pending.value }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function resizeWithHandle(
  handle: HandleId,
  pt: { x: number; y: number },
): void {
  if (!dragStartBounds) return

  const b = { ...dragStartBounds }
  const clampX = Math.max(0, Math.min(pt.x, props.imageWidth))
  const clampY = Math.max(0, Math.min(pt.y, props.imageHeight))
  const ratio = numericRatio.value

  if (ratio !== null) {
    // Corner handles only — resize proportionally
    const isLeft = handle === "nw" || handle === "sw"
    const isTop = handle === "nw" || handle === "ne"
    const isRight = handle === "ne" || handle === "se"
    const isBottom = handle === "sw" || handle === "se"

    if (isRight || isLeft) {
      let newWidth: number
      if (isRight) {
        newWidth = Math.max(MIN_DRAG_SIZE, clampX - b.x)
      } else {
        const right = b.x + b.width
        newWidth = Math.max(MIN_DRAG_SIZE, right - clampX)
      }
      const newHeight = newWidth / ratio

      if (isLeft) b.x = b.x + b.width - newWidth
      if (isTop) b.y = b.y + b.height - newHeight

      b.width = newWidth
      b.height = newHeight
    }
  } else {
    // Free-form resize
    // Horizontal edges
    if (handle === "w" || handle === "nw" || handle === "sw") {
      const right = b.x + b.width
      const newX = Math.min(clampX, right - MIN_DRAG_SIZE)
      b.width = right - newX
      b.x = newX
    }
    if (handle === "e" || handle === "ne" || handle === "se") {
      const newRight = Math.max(clampX, b.x + MIN_DRAG_SIZE)
      b.width = newRight - b.x
    }

    // Vertical edges
    if (handle === "n" || handle === "nw" || handle === "ne") {
      const bottom = b.y + b.height
      const newY = Math.min(clampY, bottom - MIN_DRAG_SIZE)
      b.height = bottom - newY
      b.y = newY
    }
    if (handle === "s" || handle === "sw" || handle === "se") {
      const newBottom = Math.max(clampY, b.y + MIN_DRAG_SIZE)
      b.height = newBottom - b.y
    }
  }

  pending.value = b
}

// ── Confirm / cancel ───────────────────────────────────────────────────────

function confirmCrop(): void {
  if (!pending.value) return

  const bounds: CropBounds = {
    x: Math.round(pending.value.x),
    y: Math.round(pending.value.y),
    width: Math.round(pending.value.width),
    height: Math.round(pending.value.height),
  }

  emit("confirm", bounds)
  pending.value = null
}

function cancelCrop(): void {
  pending.value = null
  emit("cancel")
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === "Enter" && pending.value) {
    e.preventDefault()
    confirmCrop()
  } else if (e.key === "Escape") {
    e.preventDefault()
    cancelCrop()
  }
}

// Listen for toolbar apply/cancel events
function onCropApply(): void {
  confirmCrop()
}

function onCropCancel(): void {
  cancelCrop()
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("crop-apply", onCropApply)
  window.addEventListener("crop-cancel", onCropCancel)
})

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown)
  window.removeEventListener("crop-apply", onCropApply)
  window.removeEventListener("crop-cancel", onCropCancel)
})

// ── Handle positions (image-space) ─────────────────────────────────────────

const HANDLE_SIZE = 8

interface HandleDef {
  id: HandleId
  cursor: string
  isEdge: boolean
  /** Returns image-space center of the handle */
  cx: (b: CropBounds) => number
  cy: (b: CropBounds) => number
}

const handleDefs: HandleDef[] = [
  { id: "nw", cursor: "nwse-resize", isEdge: false, cx: (b) => b.x, cy: (b) => b.y },
  {
    id: "n",
    cursor: "ns-resize",
    isEdge: true,
    cx: (b) => b.x + b.width / 2,
    cy: (b) => b.y,
  },
  {
    id: "ne",
    cursor: "nesw-resize",
    isEdge: false,
    cx: (b) => b.x + b.width,
    cy: (b) => b.y,
  },
  {
    id: "e",
    cursor: "ew-resize",
    isEdge: true,
    cx: (b) => b.x + b.width,
    cy: (b) => b.y + b.height / 2,
  },
  {
    id: "se",
    cursor: "nwse-resize",
    isEdge: false,
    cx: (b) => b.x + b.width,
    cy: (b) => b.y + b.height,
  },
  {
    id: "s",
    cursor: "ns-resize",
    isEdge: true,
    cx: (b) => b.x + b.width / 2,
    cy: (b) => b.y + b.height,
  },
  {
    id: "sw",
    cursor: "nesw-resize",
    isEdge: false,
    cx: (b) => b.x,
    cy: (b) => b.y + b.height,
  },
  {
    id: "w",
    cursor: "ew-resize",
    isEdge: true,
    cx: (b) => b.x,
    cy: (b) => b.y + b.height / 2,
  },
]

/** Only show handles that are applicable for the current ratio mode */
const visibleHandles = computed(() =>
  showEdgeHandles.value
    ? handleDefs
    : handleDefs.filter((h) => !h.isEdge),
)
</script>

<template>
  <div
    ref="rootRef"
    class="crop-overlay"
    :style="{
      width: props.imageWidth + 'px',
      height: props.imageHeight + 'px',
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <template v-if="pending">
      <!-- Top dim region -->
      <div
        class="crop-overlay__dim"
        :style="{
          top: 0,
          left: 0,
          width: props.imageWidth + 'px',
          height: pending.y + 'px',
        }"
      />
      <!-- Bottom dim region -->
      <div
        class="crop-overlay__dim"
        :style="{
          top: pending.y + pending.height + 'px',
          left: 0,
          width: props.imageWidth + 'px',
          height:
            props.imageHeight - pending.y - pending.height + 'px',
        }"
      />
      <!-- Left dim region -->
      <div
        class="crop-overlay__dim"
        :style="{
          top: pending.y + 'px',
          left: 0,
          width: pending.x + 'px',
          height: pending.height + 'px',
        }"
      />
      <!-- Right dim region -->
      <div
        class="crop-overlay__dim"
        :style="{
          top: pending.y + 'px',
          left: pending.x + pending.width + 'px',
          width:
            props.imageWidth - pending.x - pending.width + 'px',
          height: pending.height + 'px',
        }"
      />

      <!-- Selection border -->
      <div
        class="crop-overlay__selection"
        :style="{
          top: pending.y + 'px',
          left: pending.x + 'px',
          width: pending.width + 'px',
          height: pending.height + 'px',
        }"
      />

      <!-- Resize handles -->
      <div
        v-for="h in visibleHandles"
        :key="h.id"
        class="crop-overlay__handle"
        :style="{
          left: h.cx(pending) - HANDLE_SIZE / 2 + 'px',
          top: h.cy(pending) - HANDLE_SIZE / 2 + 'px',
          width: HANDLE_SIZE + 'px',
          height: HANDLE_SIZE + 'px',
          cursor: h.cursor,
        }"
        @pointerdown="(e: PointerEvent) => onHandlePointerDown(e, h.id)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      />
    </template>
  </div>
</template>

<style scoped>
.crop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  touch-action: none;
  cursor: crosshair;
}

.crop-overlay__dim {
  position: absolute;
  background: var(--overlay-dim);
  pointer-events: none;
}

.crop-overlay__selection {
  position: absolute;
  border: 2px dashed var(--border-accent);
  pointer-events: none;
  box-sizing: border-box;
}

.crop-overlay__handle {
  position: absolute;
  background: var(--interactive-default);
  border: 1px solid var(--text-inverse);
  border-radius: 2px;
  pointer-events: auto;
  z-index: 21;
}
</style>
```

- [ ] **Step 6: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: may show errors in CanvasViewport (updated in next task).

- [ ] **Step 7: Run tests**

```bash
export AGENT=1 && bun test
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/CropOverlay.vue src/utils/cropRatio.ts test/crop-settings.test.ts
git commit -m "Refactor CropOverlay to emit-based API with aspect ratio support"
```

---

### Task 10: Wire up CanvasViewport to new CropOverlay API

**Files:**
- Modify: `src/components/CanvasViewport.vue:37,834-841`

- [ ] **Step 1: Update CropOverlay usage in CanvasViewport**

In `src/components/CanvasViewport.vue`:

Add import for crop command and tool store crop settings:

```typescript
import { createCropCommand } from "../commands/CropCommand"
```

Add `getCropSettings` and `settingsVersion` to the destructured `useToolStore()`:

```typescript
const {
  activeTool,
  settingsVersion,
  getShapeSettings,
  getLineSettings,
  getCalloutSettings,
  getTextSettings,
  getRedactSettings,
  getCropSettings,
} = useToolStore()
```

Add a computed for the current aspect ratio (touching `settingsVersion` for reactivity, same pattern as SubToolbar):

```typescript
import type { AspectRatioPreset } from "../types/tools"

const cropAspectRatio = computed<AspectRatioPreset>(() => {
  void settingsVersion.value
  return getCropSettings().aspectRatio
})
```

Add handlers for crop events:

```typescript
function onCropConfirm(bounds: CropBounds): void {
  const tab = activeTab.value
  if (!tab) return

  const cmd = createCropCommand(
    tab.cropState.cropBounds.value,
    bounds,
    tab.cropState.cropBounds,
  )
  cmd.execute()
  tab.undoRedo.push(cmd)
  promoteIfClipboard()
  cropPendingBounds.value = null
}

function onCropCancel(): void {
  cropPendingBounds.value = null
}

function onCropPendingUpdate(bounds: CropBounds | null): void {
  cropPendingBounds.value = bounds
}
```

Add a ref for tracking pending state (used by SubToolbar):

```typescript
const cropPendingBounds = ref<CropBounds | null>(null)
```

Add the CropBounds import at the top:

```typescript
import type { CropBounds } from "../types/crop"
```

Replace the CropOverlay in the template (lines 834-841):

```html
        <!-- Crop overlay (z:20) for manual crop tool -->
        <CropOverlay
          v-if="activeTool === 'crop' && activeTab"
          :image-width="activeTab.imageWidth"
          :image-height="activeTab.imageHeight"
          :screen-to-image="screenToImage"
          :aspect-ratio="cropAspectRatio"
          @confirm="onCropConfirm"
          @cancel="onCropCancel"
          @update:pending="onCropPendingUpdate"
        />
```

- [ ] **Step 2: Expose cropPendingBounds for SubToolbar**

The SubToolbar needs to know if a crop region is pending to show Apply/Cancel. We'll use a window event dispatched from CropOverlay's `update:pending` handler. Update `onCropPendingUpdate`:

```typescript
function onCropPendingUpdate(bounds: CropBounds | null): void {
  cropPendingBounds.value = bounds
  window.dispatchEvent(
    new CustomEvent("crop-pending-change", { detail: bounds !== null }),
  )
}
```

In `SubToolbar.vue`, replace the `cropPending` ref setup and `defineExpose` with event listeners:

```typescript
const cropPending = ref(false)

function onCropPendingChange(e: Event): void {
  cropPending.value = (e as CustomEvent).detail as boolean
}

onMounted(() => {
  window.addEventListener("crop-pending-change", onCropPendingChange)
})

onUnmounted(() => {
  window.removeEventListener("crop-pending-change", onCropPendingChange)
})
```

Remove the `defineExpose({ cropPending })` line from SubToolbar.

Add `onMounted` and `onUnmounted` to SubToolbar imports if not already present:

```typescript
import { computed, ref, onMounted, onUnmounted } from "vue"
```

- [ ] **Step 3: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: passes.

- [ ] **Step 4: Run all tests**

```bash
export AGENT=1 && bun test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/CanvasViewport.vue src/components/SubToolbar.vue
git commit -m "Wire CanvasViewport to emit-based CropOverlay with aspect ratio"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run TypeScript check**

```bash
export AGENT=1 && bun run tsc
```

Expected: passes with no errors.

- [ ] **Step 2: Run all tests**

```bash
export AGENT=1 && bun test
```

Expected: all pass.

- [ ] **Step 3: Verify trim.rs is gone**

```bash
test ! -f src-tauri/src/trim.rs && echo "PASS: trim.rs removed" || echo "FAIL: trim.rs still exists"
```

- [ ] **Step 4: Verify TrimOverlay is gone**

```bash
test ! -f src/components/TrimOverlay.vue && echo "PASS: TrimOverlay removed" || echo "FAIL: TrimOverlay still exists"
```

- [ ] **Step 5: Verify no lingering trim references in frontend**

```bash
grep -r "detectTrimBounds\|autoTrimOnPaste\|trimThreshold\|TrimOverlay\|showTrimOverlay\|trimSuggestion" src/ --include="*.ts" --include="*.vue" || echo "PASS: no trim references"
```

Expected: "PASS: no trim references"

- [ ] **Step 6: Final commit if any remaining changes**

```bash
git status
```

If clean, done. If changes remain, stage and commit.
