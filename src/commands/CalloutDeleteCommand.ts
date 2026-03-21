import type { Command } from "../types/commands"
import type { Annotation, CalloutAnnotation } from "../types/annotations"

export interface RenumberEntry {
  before: number
  after: number
}

/**
 * Command that deletes a callout annotation and renumbers the remaining
 * callouts sequentially (1, 2, 3...). Undo restores the deleted callout
 * at its original position and restores all original numbers.
 */
export function createCalloutDeleteCommand(
  callout: CalloutAnnotation,
  index: number,
  annotations: readonly Annotation[],
  removeFn: (id: string) => void,
  insertFn: (a: Annotation, index: number) => void,
  updateFn: (id: string, patch: Partial<Annotation>) => void,
): Command {
  // Pre-compute the renumber map: what each remaining callout's number
  // will change from/to after this callout is deleted.
  const renumberMap = new Map<string, RenumberEntry>()
  let seq = 1
  for (const a of annotations) {
    if (a.type === "callout" && a.id !== callout.id) {
      const entry: RenumberEntry = { before: a.number, after: seq }
      if (entry.before !== entry.after) {
        renumberMap.set(a.id, entry)
      }
      seq++
    }
  }

  return {
    id: crypto.randomUUID(),
    label: "Delete callout",
    layer: "svg",
    execute() {
      removeFn(callout.id)
      for (const [id, entry] of renumberMap) {
        updateFn(id, { number: entry.after })
      }
    },
    undo() {
      insertFn(callout, index)
      for (const [id, entry] of renumberMap) {
        updateFn(id, { number: entry.before })
      }
    },
  }
}
