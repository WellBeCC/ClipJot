import type { Command } from "../types/commands"
import type { RedactionRegion } from "../types/redaction"

export function createRedactionCreateCommand(
  region: RedactionRegion,
  addFn: (r: RedactionRegion) => void,
  removeFn: (id: string) => void,
): Command {
  return {
    id: region.id,
    label: `Create ${region.style} redaction`,
    layer: "redaction",
    execute() {
      addFn(region)
    },
    undo() {
      removeFn(region.id)
    },
  }
}
