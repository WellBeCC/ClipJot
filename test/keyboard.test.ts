import { describe, test, expect } from "bun:test"
import { readFileSync } from "fs"
import { resolve } from "path"

const composablesDir = resolve(__dirname, "../src/composables")

const keyboardFile = readFileSync(
  resolve(composablesDir, "useKeyboard.ts"),
  "utf-8",
)

describe("Keyboard Shortcut Definitions", () => {
  test("useKeyboard.ts exports useKeyboard function", () => {
    expect(keyboardFile).toContain("export function useKeyboard")
  })

  test("useKeyboard.ts exports TOOL_KEY_MAP", () => {
    expect(keyboardFile).toContain("export const TOOL_KEY_MAP")
  })

  test("handles Cmd+C for copy", () => {
    expect(keyboardFile).toContain('e.key === "c"')
    expect(keyboardFile).toContain("handleCopy")
  })

  test("handles Cmd+S for save-to-file", () => {
    expect(keyboardFile).toContain('e.key === "s"')
    expect(keyboardFile).toContain("handleSaveToFile")
  })

  test("handles Cmd+W for close tab", () => {
    expect(keyboardFile).toContain('e.key === "w"')
    expect(keyboardFile).toContain("handleCloseTab")
  })

  test("handles Cmd+Z for undo", () => {
    expect(keyboardFile).toContain('e.key === "z"')
    expect(keyboardFile).toContain("handleUndo")
  })

  test("handles Cmd+Shift+Z and Cmd+Y for redo", () => {
    expect(keyboardFile).toContain("e.shiftKey")
    expect(keyboardFile).toContain('e.key === "y"')
    expect(keyboardFile).toContain("handleRedo")
  })

  test("handles Delete/Backspace for deleting selected annotations", () => {
    expect(keyboardFile).toContain('"Delete"')
    expect(keyboardFile).toContain('"Backspace"')
    expect(keyboardFile).toContain("handleDeleteSelected")
  })

  test("handles Escape for deselect/cancel", () => {
    expect(keyboardFile).toContain('"Escape"')
    expect(keyboardFile).toContain("handleEscape")
  })

  test("number keys 1-0 select tools", () => {
    expect(keyboardFile).toContain("TOOL_KEY_MAP[e.key]")
    expect(keyboardFile).toContain("handleToolSelect")
  })
})

describe("Tool Key Map", () => {
  test("maps 1 to select", () => {
    expect(keyboardFile).toContain('"1": "select"')
  })

  test("maps 2 to pen", () => {
    expect(keyboardFile).toContain('"2": "pen"')
  })

  test("maps 3 to pencil", () => {
    expect(keyboardFile).toContain('"3": "pencil"')
  })

  test("maps 4 to marker", () => {
    expect(keyboardFile).toContain('"4": "marker"')
  })

  test("maps 5 to eraser", () => {
    expect(keyboardFile).toContain('"5": "eraser"')
  })

  test("maps 6 to arrow", () => {
    expect(keyboardFile).toContain('"6": "arrow"')
  })

  test("maps 7 to line", () => {
    expect(keyboardFile).toContain('"7": "line"')
  })

  test("maps 8 to rect", () => {
    expect(keyboardFile).toContain('"8": "rect"')
  })

  test("maps 9 to ellipse", () => {
    expect(keyboardFile).toContain('"9": "ellipse"')
  })

  test("maps 0 to crop", () => {
    expect(keyboardFile).toContain('"0": "crop"')
  })
})

describe("Cross-Platform Meta/Ctrl", () => {
  test("uses metaKey OR ctrlKey for modifier detection", () => {
    expect(keyboardFile).toContain("e.metaKey || e.ctrlKey")
  })

  test("stores modifier check in a variable for consistency", () => {
    expect(keyboardFile).toContain("const mod = e.metaKey || e.ctrlKey")
  })
})

describe("Copy Debounce Pattern", () => {
  test("defines COPY_DEBOUNCE_MS constant", () => {
    expect(keyboardFile).toContain("COPY_DEBOUNCE_MS")
  })

  test("debounce is set to 300ms", () => {
    expect(keyboardFile).toContain("const COPY_DEBOUNCE_MS = 300")
  })

  test("tracks lastCopyTime for debounce", () => {
    expect(keyboardFile).toContain("lastCopyTime")
    expect(keyboardFile).toContain("Date.now()")
  })

  test("skips copy when within debounce window", () => {
    expect(keyboardFile).toContain("now - lastCopyTime < COPY_DEBOUNCE_MS")
  })
})

describe("Cmd+C Copy Behavior", () => {
  test("uses copyTabToClipboard from useExport", () => {
    expect(keyboardFile).toContain("copyTabToClipboard")
    expect(keyboardFile).toContain("useExport")
  })

  test("calls markTabCopied after successful copy", () => {
    expect(keyboardFile).toContain("markTabCopied(tab.id)")
  })

  test("shows success toast after copy", () => {
    expect(keyboardFile).toContain('"Copied to clipboard"')
  })

  test("shows error toast when nothing to copy", () => {
    expect(keyboardFile).toContain('"Nothing to copy"')
  })

  test("does not intercept copy in text editing mode", () => {
    expect(keyboardFile).toContain("isTextEditing(e)")
  })
})

describe("Save-to-File via Dialog", () => {
  test("uses @tauri-apps/plugin-dialog for save path", () => {
    expect(keyboardFile).toContain("@tauri-apps/plugin-dialog")
    expect(keyboardFile).toContain("save(")
  })

  test("defaults to PNG file extension", () => {
    expect(keyboardFile).toContain('"png"')
    expect(keyboardFile).toContain("PNG Image")
  })

  test("delegates to saveTabToFile for writing", () => {
    expect(keyboardFile).toContain("saveTabToFile")
  })

  test("imports save-to-file from useExport", () => {
    expect(keyboardFile).toContain('import("./useExport")')
  })

  test("handles user cancellation gracefully", () => {
    expect(keyboardFile).toContain("if (!filePath) return")
  })

  test("shows error toast on nothing to save", () => {
    expect(keyboardFile).toContain('"Nothing to save"')
  })

  test("shows success toast after save", () => {
    expect(keyboardFile).toContain('"Saved to file"')
  })
})

describe("Prevent Default", () => {
  test("calls preventDefault for Cmd+C", () => {
    // Every shortcut branch calls e.preventDefault()
    const copyBlock = keyboardFile.slice(
      keyboardFile.indexOf('e.key === "c"'),
      keyboardFile.indexOf('e.key === "s"'),
    )
    expect(copyBlock).toContain("e.preventDefault()")
  })

  test("calls preventDefault for Cmd+S", () => {
    const saveBlock = keyboardFile.slice(
      keyboardFile.indexOf('e.key === "s"'),
      keyboardFile.indexOf('e.key === "w"'),
    )
    expect(saveBlock).toContain("e.preventDefault()")
  })

  test("calls preventDefault for Escape", () => {
    const escBlock = keyboardFile.slice(
      keyboardFile.indexOf('"Escape"'),
      keyboardFile.indexOf("TOOL_KEY_MAP[e.key]"),
    )
    expect(escBlock).toContain("e.preventDefault()")
  })
})

describe("Text Editing Guard", () => {
  test("checks for INPUT elements", () => {
    expect(keyboardFile).toContain('"INPUT"')
  })

  test("checks for TEXTAREA elements", () => {
    expect(keyboardFile).toContain('"TEXTAREA"')
  })

  test("checks for contentEditable elements", () => {
    expect(keyboardFile).toContain("isContentEditable")
  })
})

describe("Escape Behavior", () => {
  test("cancels crop mode on Escape", () => {
    expect(keyboardFile).toContain("cropState.cropBounds")
    expect(keyboardFile).toContain("cropState.showTrimOverlay")
  })

  test("deselects selection on Escape", () => {
    expect(keyboardFile).toContain("deselect()")
    expect(keyboardFile).toContain("hasSelection")
  })

  test("falls back to select tool on Escape", () => {
    expect(keyboardFile).toContain('setTool("select")')
  })
})

describe("Tab Store — requestCloseTab", () => {
  const tabStoreFile = readFileSync(
    resolve(composablesDir, "useTabStore.ts"),
    "utf-8",
  )

  test("useTabStore.ts exports requestCloseTab", () => {
    expect(tabStoreFile).toContain("requestCloseTab")
  })

  test("requestCloseTab returns 'closed' or 'needs-warning'", () => {
    expect(tabStoreFile).toContain('"closed"')
    expect(tabStoreFile).toContain('"needs-warning"')
  })

  test("requestCloseTab checks autoCopyOnClose setting", () => {
    expect(tabStoreFile).toContain("autoCopyOnClose")
  })

  test("requestCloseTab calls copyTabToClipboard when auto-copy enabled", () => {
    expect(tabStoreFile).toContain("copyTabToClipboard(tab)")
  })

  test("requestCloseTab calls markTabCopied after auto-copy", () => {
    const fnStart = tabStoreFile.indexOf("async function requestCloseTab")
    const fnEnd = tabStoreFile.indexOf("return \"needs-warning\"", fnStart)
    const fnBody = tabStoreFile.slice(fnStart, fnEnd)
    expect(fnBody).toContain("markTabCopied(tabId)")
  })

  test("requestCloseTab checks hasUncopiedEdits before dialog", () => {
    const fnStart = tabStoreFile.indexOf("async function requestCloseTab")
    const fnEnd = tabStoreFile.indexOf("return \"needs-warning\"", fnStart)
    const fnBody = tabStoreFile.slice(fnStart, fnEnd)
    expect(fnBody).toContain("copiedSinceLastEdit")
    expect(fnBody).toContain("isEdited")
  })

  test("requestCloseTab closes directly when no edits", () => {
    const fnStart = tabStoreFile.indexOf("async function requestCloseTab")
    const fnBody = tabStoreFile.slice(
      fnStart,
      tabStoreFile.indexOf("// Lazy-import", fnStart),
    )
    expect(fnBody).toContain("closeTab(tabId)")
    expect(fnBody).toContain('return "closed"')
  })
})

describe("Main Entry Point", () => {
  const mainFile = readFileSync(
    resolve(__dirname, "../src/main.ts"),
    "utf-8",
  )

  test("main.ts imports useKeyboard", () => {
    expect(mainFile).toContain("useKeyboard")
    expect(mainFile).toContain("./composables/useKeyboard")
  })

  test("main.ts initializes useKeyboard after mount", () => {
    const mountIndex = mainFile.indexOf(".mount(")
    const keyboardIndex = mainFile.indexOf("useKeyboard()")
    expect(mountIndex).toBeGreaterThan(-1)
    expect(keyboardIndex).toBeGreaterThan(-1)
    expect(keyboardIndex).toBeGreaterThan(mountIndex)
  })
})

describe("Keyboard Idempotence", () => {
  test("useKeyboard is idempotent (safe to call multiple times)", () => {
    expect(keyboardFile).toContain("isInitialized")
  })

  test("returns a destroy function for cleanup", () => {
    expect(keyboardFile).toContain("destroy")
    expect(keyboardFile).toContain("removeEventListener")
  })
})
