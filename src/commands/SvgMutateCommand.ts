import type { Command } from "../types/commands"
import type { Annotation } from "../types/annotations"

export function createSvgMutateCommand(
  annotationId: string,
  before: Partial<Annotation>,
  after: Partial<Annotation>,
  updateFn: (id: string, patch: Partial<Annotation>) => void,
): Command {
  return {
    id: crypto.randomUUID(),
    label: "Update annotation",
    layer: "svg",
    execute() {
      updateFn(annotationId, after)
    },
    undo() {
      updateFn(annotationId, before)
    },
  }
}
