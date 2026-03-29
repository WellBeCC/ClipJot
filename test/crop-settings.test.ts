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
