import { describe, test, expect } from "bun:test"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const srcDir = resolve(__dirname, "../src")
const componentsDir = resolve(srcDir, "components")
const composablesDir = resolve(srcDir, "composables")
const typesDir = resolve(srcDir, "types")

describe("Tab Types", () => {
  test("tab.ts defines the Tab interface", () => {
    const content = readFileSync(resolve(typesDir, "tab.ts"), "utf-8")
    expect(content).toContain("export interface Tab")
    expect(content).toContain('type: "clipboard" | "editing"')
    expect(content).toContain("imageUrl: string | null")
    expect(content).toContain("undoRedo: UndoRedoInstance")
    expect(content).toContain("copiedSinceLastEdit")
    expect(content).toContain("imageWidth")
    expect(content).toContain("imageHeight")
  })

  test("tab.ts imports UndoRedoInstance", () => {
    const content = readFileSync(resolve(typesDir, "tab.ts"), "utf-8")
    expect(content).toContain("UndoRedoInstance")
    expect(content).toContain("useUndoRedo")
  })
})

describe("Clipboard Composable", () => {
  test("useClipboard.ts exists with correct exports", () => {
    const content = readFileSync(
      resolve(composablesDir, "useClipboard.ts"),
      "utf-8",
    )
    expect(content).toContain("readClipboardImage")
    expect(content).toContain("writeClipboardImage")
    expect(content).toContain("readImage")
    expect(content).toContain("ClipboardImage")
  })

  test("useClipboard.ts uses Tauri clipboard plugin", () => {
    const content = readFileSync(
      resolve(composablesDir, "useClipboard.ts"),
      "utf-8",
    )
    expect(content).toContain("@tauri-apps/plugin-clipboard-manager")
    expect(content).toContain("OffscreenCanvas")
    expect(content).toContain("createObjectURL")
  })

  test("useClipboard.ts handles errors gracefully", () => {
    const content = readFileSync(
      resolve(composablesDir, "useClipboard.ts"),
      "utf-8",
    )
    expect(content).toContain("catch")
    expect(content).toContain("return null")
  })

  test("useClipboard.ts uses Image.new for write", () => {
    const content = readFileSync(
      resolve(composablesDir, "useClipboard.ts"),
      "utf-8",
    )
    expect(content).toContain("Image.new")
    expect(content).toContain("@tauri-apps/api/image")
  })

  test("useClipboard.ts uses image.size() for dimensions", () => {
    const content = readFileSync(
      resolve(composablesDir, "useClipboard.ts"),
      "utf-8",
    )
    expect(content).toContain("image.size()")
  })
})

describe("Tab Store", () => {
  test("useTabStore.ts exists with correct exports", () => {
    const content = readFileSync(
      resolve(composablesDir, "useTabStore.ts"),
      "utf-8",
    )
    expect(content).toContain("useTabStore")
    expect(content).toContain("activeTab")
    expect(content).toContain("clipboardTab")
    expect(content).toContain("setActiveTab")
    expect(content).toContain("updateClipboardImage")
  })

  test("useTabStore.ts initializes clipboard tab", () => {
    const content = readFileSync(
      resolve(composablesDir, "useTabStore.ts"),
      "utf-8",
    )
    expect(content).toContain('id: "clipboard"')
    expect(content).toContain('type: "clipboard"')
    expect(content).toContain('name: "Clipboard"')
  })

  test("useTabStore.ts uses shallowRef for tabs array", () => {
    const content = readFileSync(
      resolve(composablesDir, "useTabStore.ts"),
      "utf-8",
    )
    expect(content).toContain("shallowRef<Tab[]>")
    expect(content).toContain("triggerRef")
  })

  test("useTabStore.ts revokes old URLs on clipboard update", () => {
    const content = readFileSync(
      resolve(composablesDir, "useTabStore.ts"),
      "utf-8",
    )
    expect(content).toContain("revokeObjectURL")
  })

  test("useTabStore.ts uses module-level singleton pattern", () => {
    const content = readFileSync(
      resolve(composablesDir, "useTabStore.ts"),
      "utf-8",
    )
    // Module-level state outside the composable function
    expect(content).toContain("const tabs = shallowRef")
    expect(content).toContain("const activeTabId = ref")
    // These should be declared before the exported function
    const tabsIndex = content.indexOf("const tabs = shallowRef")
    const functionIndex = content.indexOf("export function useTabStore")
    expect(tabsIndex).toBeLessThan(functionIndex)
  })
})

describe("EmptyClipboard Component", () => {
  test("EmptyClipboard.vue exists", () => {
    expect(existsSync(resolve(componentsDir, "EmptyClipboard.vue"))).toBe(true)
  })

  test("EmptyClipboard.vue shows instruction text", () => {
    const content = readFileSync(
      resolve(componentsDir, "EmptyClipboard.vue"),
      "utf-8",
    )
    expect(content).toContain("No image in clipboard")
    expect(content).toContain("Cmd+Shift+J")
  })

  test("EmptyClipboard.vue uses semantic tokens", () => {
    const content = readFileSync(
      resolve(componentsDir, "EmptyClipboard.vue"),
      "utf-8",
    )
    expect(content).toContain("var(--text-primary)")
    expect(content).toContain("var(--text-secondary)")
    expect(content).not.toMatch(/var\(--flexoki-/)
  })
})

describe("TabItem Component", () => {
  test("TabItem.vue exists with correct props", () => {
    const content = readFileSync(
      resolve(componentsDir, "TabItem.vue"),
      "utf-8",
    )
    expect(content).toContain("tab: Tab")
    expect(content).toContain("isActive: boolean")
  })

  test("TabItem.vue handles clipboard and editing tab types", () => {
    const content = readFileSync(
      resolve(componentsDir, "TabItem.vue"),
      "utf-8",
    )
    expect(content).toContain("tab.type === 'clipboard'")
    expect(content).toContain("copiedSinceLastEdit")
    expect(content).toContain("tab-item--clipboard")
    expect(content).toContain("tab-item--copied")
  })

  test("TabItem.vue emits select event", () => {
    const content = readFileSync(
      resolve(componentsDir, "TabItem.vue"),
      "utf-8",
    )
    expect(content).toContain("select: [tabId: string]")
    expect(content).toContain("emit('select'")
  })

  test("TabItem.vue uses semantic tokens", () => {
    const content = readFileSync(
      resolve(componentsDir, "TabItem.vue"),
      "utf-8",
    )
    expect(content).toContain("var(--tab-default)")
    expect(content).toContain("var(--tab-active)")
    expect(content).toContain("var(--tab-clipboard)")
    expect(content).toContain("var(--tab-copied)")
    expect(content).not.toMatch(/var\(--flexoki-/)
  })
})

describe("CanvasViewport Integration", () => {
  test("CanvasViewport.vue shows EmptyClipboard when no image", () => {
    const content = readFileSync(
      resolve(componentsDir, "CanvasViewport.vue"),
      "utf-8",
    )
    expect(content).toContain("EmptyClipboard")
    expect(content).toContain("hasImage")
    expect(content).toContain("activeTab")
  })

  test("CanvasViewport.vue uses useTabStore", () => {
    const content = readFileSync(
      resolve(componentsDir, "CanvasViewport.vue"),
      "utf-8",
    )
    expect(content).toContain("useTabStore")
  })

  test("CanvasViewport.vue displays image with correct attributes", () => {
    const content = readFileSync(
      resolve(componentsDir, "CanvasViewport.vue"),
      "utf-8",
    )
    expect(content).toContain("activeTab.imageUrl")
    expect(content).toContain("activeTab.imageWidth")
    expect(content).toContain("activeTab.imageHeight")
    expect(content).toContain('draggable="false"')
  })

  test("CanvasViewport.vue preserves flex: 1 and position: relative", () => {
    const content = readFileSync(
      resolve(componentsDir, "CanvasViewport.vue"),
      "utf-8",
    )
    expect(content).toContain("flex: 1")
    expect(content).toContain("position: relative")
  })

  test("CanvasViewport.vue uses semantic tokens only", () => {
    const content = readFileSync(
      resolve(componentsDir, "CanvasViewport.vue"),
      "utf-8",
    )
    expect(content).toContain("var(--surface-canvas)")
    expect(content).not.toMatch(/var\(--flexoki-/)
  })
})

describe("TabBar Integration", () => {
  test("TabBar.vue renders TabItem components", () => {
    const content = readFileSync(
      resolve(componentsDir, "TabBar.vue"),
      "utf-8",
    )
    expect(content).toContain("TabItem")
    expect(content).toContain("v-for")
    expect(content).toContain("useTabStore")
  })

  test("TabBar.vue preserves flex-shrink: 0", () => {
    const content = readFileSync(
      resolve(componentsDir, "TabBar.vue"),
      "utf-8",
    )
    expect(content).toContain("flex-shrink: 0")
  })
})
