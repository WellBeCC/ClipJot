import { describe, test, expect, beforeEach } from "bun:test"
import { readFileSync } from "fs"
import { resolve } from "path"
import type { RedactionRegion } from "../../src/types/redaction"
import {
  PIXELATE_BLOCK_SIZES,
  BLUR_RADII,
  SOLID_DEFAULT_COLOR,
  blockSizeForStrength,
  blurRadiusForStrength,
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
    blockSize: PIXELATE_BLOCK_SIZES[2],
    blurRadius: BLUR_RADII[2],
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
    const region = makeRegion({ style: "blur", blurRadius: blurRadiusForStrength(2) })
    store.addRegion(region)

    expect(store.regions.value).toHaveLength(1)
    expect(store.regions.value[0].style).toBe("blur")
    expect(store.regions.value[0].blurRadius).toBe(8)
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

describe("Redaction security: lowest strength preset provides adequate redaction", () => {
  test("lowest blur strength (1) provides radius of 4px", () => {
    expect(blurRadiusForStrength(1)).toBe(4)
    expect(BLUR_RADII[1]).toBe(4)
  })

  test("lowest pixelation strength (1) provides block size of 8px", () => {
    expect(blockSizeForStrength(1)).toBe(8)
    expect(PIXELATE_BLOCK_SIZES[1]).toBe(8)
  })

  test("all blur strength levels return positive values", () => {
    for (const s of [1, 2, 3] as const) {
      expect(blurRadiusForStrength(s)).toBeGreaterThan(0)
    }
  })

  test("all pixelation strength levels return positive values", () => {
    for (const s of [1, 2, 3] as const) {
      expect(blockSizeForStrength(s)).toBeGreaterThan(0)
    }
  })

  test("higher strength produces larger blur radius", () => {
    expect(blurRadiusForStrength(2)).toBeGreaterThan(blurRadiusForStrength(1))
    expect(blurRadiusForStrength(3)).toBeGreaterThan(blurRadiusForStrength(2))
  })

  test("higher strength produces larger block size", () => {
    expect(blockSizeForStrength(2)).toBeGreaterThan(blockSizeForStrength(1))
    expect(blockSizeForStrength(3)).toBeGreaterThan(blockSizeForStrength(2))
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
    const region = makeRegion({ style: "blur", blurRadius: blurRadiusForStrength(2) })

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
