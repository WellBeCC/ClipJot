import type { Command } from "../types/commands"
import type { RedactionRegion } from "../types/redaction"

export function createRedactionDeleteCommand(
  region: RedactionRegion,
  index: number,
  removeFn: (id: string) => void,
  insertFn: (r: RedactionRegion, index: number) => void,
): Command {
  return {
    id: crypto.randomUUID(),
    label: `Delete ${region.style} redaction`,
    layer: "redaction",
    execute() {
      removeFn(region.id)
    },
    undo() {
      insertFn(region, index)
    },
  }
}
