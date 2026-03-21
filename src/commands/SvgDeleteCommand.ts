import type { Command } from "../types/commands"
import type { Annotation } from "../types/annotations"

export function createSvgDeleteCommand(
  annotation: Annotation,
  index: number,
  removeFn: (id: string) => void,
  insertFn: (a: Annotation, index: number) => void,
): Command {
  return {
    id: crypto.randomUUID(),
    label: `Delete ${annotation.type}`,
    layer: "svg",
    execute() {
      removeFn(annotation.id)
    },
    undo() {
      insertFn(annotation, index)
    },
  }
}
