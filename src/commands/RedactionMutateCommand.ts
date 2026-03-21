import type { Command } from "../types/commands"
import type { RedactionRegion } from "../types/redaction"

export function createRedactionMutateCommand(
  regionId: string,
  before: Partial<RedactionRegion>,
  after: Partial<RedactionRegion>,
  updateFn: (id: string, patch: Partial<RedactionRegion>) => void,
): Command {
  return {
    id: crypto.randomUUID(),
    label: "Update redaction",
    layer: "redaction",
    execute() {
      updateFn(regionId, after)
    },
    undo() {
      updateFn(regionId, before)
    },
  }
}
