import type { Command } from "../types/commands"
import type { CropBounds } from "../types/crop"

/**
 * Create an undoable crop command.
 * Swaps crop bounds on a ref-like object (e.g., CropState.cropBounds).
 */
export function createCropCommand(
  previousBounds: CropBounds | null,
  newBounds: CropBounds,
  cropRef: { value: CropBounds | null },
): Command {
  return {
    id: crypto.randomUUID(),
    label: "Crop",
    layer: "crop",
    execute() {
      cropRef.value = newBounds
    },
    undo() {
      cropRef.value = previousBounds
    },
  }
}
