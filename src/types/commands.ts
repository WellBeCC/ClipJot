/**
 * Base interface for all undoable commands.
 * Each command encapsulates a reversible operation.
 */
export interface Command {
  /** Unique ID for debugging */
  readonly id: string
  /** Human-readable label (e.g., "Draw stroke", "Move arrow") */
  readonly label: string
  /** Which layer this command affects */
  readonly layer: "freehand" | "svg" | "redaction" | "crop"
  /** Apply the action */
  execute(): void
  /** Reverse the action */
  undo(): void
}

/**
 * A compound command that executes/undoes multiple sub-commands as one unit.
 * Used for batch operations like multi-select delete, callout renumber.
 */
export interface CompoundCommand extends Command {
  readonly commands: readonly Command[]
}

/**
 * Creates a compound command from an array of sub-commands.
 * Execute runs all forward; undo runs all in reverse.
 */
export function createCompoundCommand(
  label: string,
  layer: Command["layer"],
  commands: readonly Command[],
): CompoundCommand {
  return {
    id: crypto.randomUUID(),
    label,
    layer,
    commands,
    execute() {
      for (const cmd of this.commands) {
        cmd.execute()
      }
    },
    undo() {
      for (let i = this.commands.length - 1; i >= 0; i--) {
        this.commands[i].undo()
      }
    },
  }
}
