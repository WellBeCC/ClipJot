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
