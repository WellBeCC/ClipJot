import { describe, test, expect, beforeEach } from "bun:test"
import { useSelection } from "../src/composables/useSelection"

describe("useSelection", () => {
  let selection: ReturnType<typeof useSelection>

  beforeEach(() => {
    selection = useSelection()
    // Clear any leftover state from previous tests (module-level singleton)
    selection.deselect()
  })

  test("initially has no selection", () => {
    expect(selection.hasSelection.value).toBe(false)
    expect(selection.selectedIds.value.size).toBe(0)
  })

  test("select adds a single id", () => {
    selection.select("a")
    expect(selection.isSelected("a")).toBe(true)
    expect(selection.selectedIds.value.size).toBe(1)
  })

  test("select replaces previous selection by default", () => {
    selection.select("a")
    selection.select("b")
    expect(selection.isSelected("a")).toBe(false)
    expect(selection.isSelected("b")).toBe(true)
    expect(selection.selectedIds.value.size).toBe(1)
  })

  test("select with additive=true adds to selection", () => {
    selection.select("a")
    selection.select("b", true)
    expect(selection.isSelected("a")).toBe(true)
    expect(selection.isSelected("b")).toBe(true)
    expect(selection.selectedIds.value.size).toBe(2)
  })

  test("select with additive=true toggles off if already selected", () => {
    selection.select("a")
    selection.select("b", true)
    selection.select("a", true) // Toggle off 'a'
    expect(selection.isSelected("a")).toBe(false)
    expect(selection.isSelected("b")).toBe(true)
    expect(selection.selectedIds.value.size).toBe(1)
  })

  test("deselect clears all", () => {
    selection.select("a")
    selection.select("b", true)
    selection.deselect()
    expect(selection.hasSelection.value).toBe(false)
    expect(selection.selectedIds.value.size).toBe(0)
  })

  test("isSelected returns false for unknown id", () => {
    expect(selection.isSelected("nonexistent")).toBe(false)
  })

  test("hasSelection is reactive", () => {
    expect(selection.hasSelection.value).toBe(false)
    selection.select("a")
    expect(selection.hasSelection.value).toBe(true)
    selection.deselect()
    expect(selection.hasSelection.value).toBe(false)
  })

  test("multi-select with shift pattern", () => {
    // Simulate: click a, shift+click b, shift+click c
    selection.select("a")
    selection.select("b", true)
    selection.select("c", true)
    expect(selection.selectedIds.value.size).toBe(3)
    expect(selection.isSelected("a")).toBe(true)
    expect(selection.isSelected("b")).toBe(true)
    expect(selection.isSelected("c")).toBe(true)
  })

  test("non-additive select after multi-select resets to single", () => {
    selection.select("a")
    selection.select("b", true)
    selection.select("c", true)
    selection.select("d") // Non-additive replaces all
    expect(selection.selectedIds.value.size).toBe(1)
    expect(selection.isSelected("d")).toBe(true)
    expect(selection.isSelected("a")).toBe(false)
  })
})
