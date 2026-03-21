import { describe, test, expect, beforeEach } from "bun:test"
import { readFileSync } from "fs"
import { resolve } from "path"
import type { RedactionRegion } from "../../src/types/redaction"
import {
  BLUR_MIN,
  BLUR_MAX,
  PIXELATE_MIN,
  PIXELATE_MAX,
  PIXELATE_DEFAULT,
  BLUR_DEFAULT,
  SOLID_DEFAULT_COLOR,
  clampBlurRadius,
  clampBlockSize,
} from "../../src/types/redaction"
import {
  createRedactionState,
  useRedactionStore,
} from "../../src/composables/useRedaction"
import type { RedactionState } from "../../src/composables/useRedaction"
import { createRedactionCreateCommand } from "../../src/commands/RedactionCreateCommand"
import { createRedactionMutateCommand } from "../../src/commands/RedactionMutateCommand"
import { createRedactionDeleteCommand } from "../../src/commands/RedactionDeleteCommand"
import { createUndoRedo } from "../../src/composables/useUndoRedo"

function makeRegion(
  overrides?: Partial<RedactionRegion>,
): RedactionRegion {
  return {
    id: crypto.randomUUID(),
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    style: "solid",
    solidColor: SOLID_DEFAULT_COLOR,
    blockSize: PIXELATE_DEFAULT,
    blurRadius: BLUR_DEFAULT,
    ...overrides,
  }
}

describe("Redaction security: region creation with all 3 styles", () => {
  let redState: RedactionState
  let store: ReturnType<typeof useRedactionStore>

  beforeEach(() => {
    redState = createRedactionState()
    store = useRedactionStore(redState)
  })

  test("solid region creates correctly", () => {
    const region = makeRegion({ style: "solid", solidColor: "#000000" })
    store.addRegion(region)

    expect(store.regions.value).toHaveLength(1)
    expect(store.regions.value[0].style).toBe("solid")
    expect(store.regions.value[0].solidColor).toBe("#000000")
  })

  test("pixelate region creates correctly", () => {
    const region = makeRegion({ style: "pixelate", blockSize: 16 })
    store.addRegion(region)

    expect(store.regions.value).toHaveLength(1)
    expect(store.regions.value[0].style).toBe("pixelate")
    expect(store.regions.value[0].blockSize).toBe(16)
  })

  test("blur region creates correctly", () => {
    const region = makeRegion({ style: "blur", blurRadius: 45 })
    store.addRegion(region)

    expect(store.regions.value).toHaveLength(1)
    expect(store.regions.value[0].style).toBe("blur")
    expect(store.regions.value[0].blurRadius).toBe(45)
  })

  test("all 3 styles can coexist", () => {
    store.addRegion(makeRegion({ style: "solid" }))
    store.addRegion(makeRegion({ style: "pixelate" }))
    store.addRegion(makeRegion({ style: "blur" }))

    expect(store.regions.value).toHaveLength(3)
    const styles = store.regions.value.map((r) => r.style)
    expect(styles).toEqual(["solid", "pixelate", "blur"])
  })
})

describe("Redaction security: blur minimum enforced at 40px", () => {
  test("clampBlurRadius floors at BLUR_MIN (40)", () => {
    expect(clampBlurRadius(0)).toBe(BLUR_MIN)
    expect(clampBlurRadius(1)).toBe(BLUR_MIN)
    expect(clampBlurRadius(10)).toBe(BLUR_MIN)
    expect(clampBlurRadius(20)).toBe(BLUR_MIN)
    expect(clampBlurRadius(39)).toBe(BLUR_MIN)
  })

  test("clampBlurRadius caps at BLUR_MAX (50)", () => {
    expect(clampBlurRadius(51)).toBe(BLUR_MAX)
    expect(clampBlurRadius(100)).toBe(BLUR_MAX)
    expect(clampBlurRadius(999)).toBe(BLUR_MAX)
  })

  test("clampBlurRadius preserves valid values", () => {
    expect(clampBlurRadius(40)).toBe(40)
    expect(clampBlurRadius(45)).toBe(45)
    expect(clampBlurRadius(50)).toBe(50)
  })

  test("negative blur radius clamped to minimum", () => {
    expect(clampBlurRadius(-10)).toBe(BLUR_MIN)
    expect(clampBlurRadius(-1)).toBe(BLUR_MIN)
  })
})

describe("Redaction security: pixelation minimum enforced at 12px", () => {
  test("clampBlockSize floors at PIXELATE_MIN (12)", () => {
    expect(clampBlockSize(0)).toBe(PIXELATE_MIN)
    expect(clampBlockSize(1)).toBe(PIXELATE_MIN)
    expect(clampBlockSize(5)).toBe(PIXELATE_MIN)
    expect(clampBlockSize(11)).toBe(PIXELATE_MIN)
  })

  test("clampBlockSize caps at PIXELATE_MAX (32)", () => {
    expect(clampBlockSize(33)).toBe(PIXELATE_MAX)
    expect(clampBlockSize(100)).toBe(PIXELATE_MAX)
    expect(clampBlockSize(999)).toBe(PIXELATE_MAX)
  })

  test("clampBlockSize preserves valid values", () => {
    expect(clampBlockSize(12)).toBe(12)
    expect(clampBlockSize(16)).toBe(16)
    expect(clampBlockSize(24)).toBe(24)
    expect(clampBlockSize(32)).toBe(32)
  })

  test("negative block size clamped to minimum", () => {
    expect(clampBlockSize(-5)).toBe(PIXELATE_MIN)
    expect(clampBlockSize(-1)).toBe(PIXELATE_MIN)
  })
})

describe("Redaction security: export pipeline order", () => {
  test("export applies redaction before freehand strokes", () => {
    const exportFile = readFileSync(
      resolve(__dirname, "../../src/composables/useExport.ts"),
      "utf-8",
    )
    const redactionIndex = exportFile.indexOf("renderRedactionRegion")
    const freehandIndex = exportFile.indexOf("redrawAll")
    expect(redactionIndex).toBeGreaterThan(-1)
    expect(freehandIndex).toBeGreaterThan(-1)
    expect(redactionIndex).toBeLessThan(freehandIndex)
  })

  test("export applies redaction before SVG annotations", () => {
    const exportFile = readFileSync(
      resolve(__dirname, "../../src/composables/useExport.ts"),
      "utf-8",
    )
    const redactionIndex = exportFile.indexOf("renderRedactionRegion")
    const svgIndex = exportFile.indexOf("renderAnnotationsToImage")
    expect(redactionIndex).toBeGreaterThan(-1)
    expect(svgIndex).toBeGreaterThan(-1)
    expect(redactionIndex).toBeLessThan(svgIndex)
  })

  test("export includes the redaction step", () => {
    const exportFile = readFileSync(
      resolve(__dirname, "../../src/composables/useExport.ts"),
      "utf-8",
    )
    expect(exportFile).toContain("redactionState.regions")
    expect(exportFile).toContain("renderRedactionRegion")
  })
})

describe("Redaction security: commands are all undoable", () => {
  let redState: RedactionState
  let store: ReturnType<typeof useRedactionStore>
  let undoRedo: ReturnType<typeof createUndoRedo>

  beforeEach(() => {
    redState = createRedactionState()
    store = useRedactionStore(redState)
    undoRedo = createUndoRedo()
  })

  test("RedactionCreateCommand: create and undo via stack", () => {
    const region = makeRegion({ style: "blur", blurRadius: 45 })

    undoRedo.push(
      createRedactionCreateCommand(
        region,
        store.addRegion,
        (id) => store.removeRegion(id),
      ),
    )

    expect(store.regions.value).toHaveLength(1)

    undoRedo.undo()
    expect(store.regions.value).toHaveLength(0)

    undoRedo.redo()
    expect(store.regions.value).toHaveLength(1)
    expect(store.regions.value[0].style).toBe("blur")
  })

  test("RedactionMutateCommand: mutate and undo via stack", () => {
    const region = makeRegion({ style: "solid", solidColor: "#000000" })
    store.addRegion(region)

    undoRedo.push(
      createRedactionMutateCommand(
        region.id,
        { solidColor: "#000000" },
        { solidColor: "#ff0000" },
        store.updateRegion,
      ),
    )

    expect(store.regions.value[0].solidColor).toBe("#ff0000")

    undoRedo.undo()
    expect(store.regions.value[0].solidColor).toBe("#000000")

    undoRedo.redo()
    expect(store.regions.value[0].solidColor).toBe("#ff0000")
  })

  test("RedactionDeleteCommand: delete and undo via stack", () => {
    const r1 = makeRegion()
    const r2 = makeRegion()
    const r3 = makeRegion()
    store.addRegion(r1)
    store.addRegion(r2)
    store.addRegion(r3)

    undoRedo.push(
      createRedactionDeleteCommand(
        r2,
        1,
        (id) => store.removeRegion(id),
        store.insertRegion,
      ),
    )

    expect(store.regions.value).toHaveLength(2)
    expect(store.regions.value[0].id).toBe(r1.id)
    expect(store.regions.value[1].id).toBe(r3.id)

    undoRedo.undo()
    expect(store.regions.value).toHaveLength(3)
    expect(store.regions.value[1].id).toBe(r2.id)

    undoRedo.redo()
    expect(store.regions.value).toHaveLength(2)
  })

  test("mixed redaction commands: create, mutate, delete all undoable in sequence", () => {
    const region = makeRegion({ style: "pixelate", blockSize: 16 })

    // Create
    undoRedo.push(
      createRedactionCreateCommand(
        region,
        store.addRegion,
        (id) => store.removeRegion(id),
      ),
    )
    expect(store.regions.value).toHaveLength(1)

    // Mutate
    undoRedo.push(
      createRedactionMutateCommand(
        region.id,
        { blockSize: 16 },
        { blockSize: 24 },
        store.updateRegion,
      ),
    )
    expect(store.regions.value[0].blockSize).toBe(24)

    // Delete
    undoRedo.push(
      createRedactionDeleteCommand(
        { ...store.regions.value[0] },
        0,
        (id) => store.removeRegion(id),
        store.insertRegion,
      ),
    )
    expect(store.regions.value).toHaveLength(0)

    // Undo delete → region restored with blockSize 24
    undoRedo.undo()
    expect(store.regions.value).toHaveLength(1)
    expect(store.regions.value[0].blockSize).toBe(24)

    // Undo mutate → back to blockSize 16
    undoRedo.undo()
    expect(store.regions.value[0].blockSize).toBe(16)

    // Undo create → empty
    undoRedo.undo()
    expect(store.regions.value).toHaveLength(0)
  })
})
