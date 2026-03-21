import type { Command } from "../types/commands"
import type { Annotation } from "../types/annotations"

export function createSvgCreateCommand(
  annotation: Annotation,
  addFn: (a: Annotation) => void,
  removeFn: (id: string) => void,
): Command {
  return {
    id: annotation.id,
    label: `Create ${annotation.type}`,
    layer: "svg",
    execute() {
      addFn(annotation)
    },
    undo() {
      removeFn(annotation.id)
    },
  }
}
