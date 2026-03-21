import { describe, test, expect, beforeEach } from "bun:test"
import { createUndoRedo } from "../src/composables/useUndoRedo"
import type { Command } from "../src/types/commands"
import { createCompoundCommand } from "../src/types/commands"

/** Helper to create a mock command that tracks execution counts. */
function mockCommand(
  label: string,
  layer: Command["layer"] = "svg",
): Command & { executeCount: number; undoCount: number } {
  const cmd = {
    id: crypto.randomUUID(),
    label,
    layer,
    executeCount: 0,
    undoCount: 0,
    execute() {
      cmd.executeCount++
    },
    undo() {
      cmd.undoCount++
    },
  }
  return cmd
}

describe("Undo/Redo Infrastructure", () => {
  let stack: ReturnType<typeof createUndoRedo>

  beforeEach(() => {
    stack = createUndoRedo(50)
  })

  describe("push", () => {
    test("executes the command on push", () => {
      const cmd = mockCommand("test")
      stack.push(cmd)
      expect(cmd.executeCount).toBe(1)
    })

    test("increments cursor", () => {
      stack.push(mockCommand("a"))
      expect(stack.cursor.value).toBe(0)
      stack.push(mockCommand("b"))
      expect(stack.cursor.value).toBe(1)
    })

    test("canUndo is true after push", () => {
      expect(stack.canUndo.value).toBe(false)
      stack.push(mockCommand("a"))
      expect(stack.canUndo.value).toBe(true)
    })

    test("canRedo is false after push", () => {
      stack.push(mockCommand("a"))
      expect(stack.canRedo.value).toBe(false)
    })
  })

  describe("undo", () => {
    test("calls undo on the current command", () => {
      const cmd = mockCommand("test")
      stack.push(cmd)
      stack.undo()
      expect(cmd.undoCount).toBe(1)
    })

    test("decrements cursor", () => {
      stack.push(mockCommand("a"))
      stack.push(mockCommand("b"))
      expect(stack.cursor.value).toBe(1)
      stack.undo()
      expect(stack.cursor.value).toBe(0)
    })

    test("enables redo after undo", () => {
      stack.push(mockCommand("a"))
      expect(stack.canRedo.value).toBe(false)
      stack.undo()
      expect(stack.canRedo.value).toBe(true)
    })

    test("does nothing when stack is empty", () => {
      stack.undo()
      expect(stack.cursor.value).toBe(-1)
    })

    test("canUndo becomes false after undoing everything", () => {
      stack.push(mockCommand("a"))
      stack.undo()
      expect(stack.canUndo.value).toBe(false)
    })
  })

  describe("redo", () => {
    test("calls execute on the next command", () => {
      const cmd = mockCommand("test")
      stack.push(cmd)
      stack.undo()
      stack.redo()
      expect(cmd.executeCount).toBe(2) // Once on push, once on redo
    })

    test("increments cursor", () => {
      stack.push(mockCommand("a"))
      stack.undo()
      expect(stack.cursor.value).toBe(-1)
      stack.redo()
      expect(stack.cursor.value).toBe(0)
    })

    test("does nothing when nothing to redo", () => {
      stack.push(mockCommand("a"))
      stack.redo()
      expect(stack.cursor.value).toBe(0)
    })
  })

  describe("redo branch truncation", () => {
    test("new push after undo clears redo branch", () => {
      stack.push(mockCommand("a"))
      stack.push(mockCommand("b"))
      stack.push(mockCommand("c"))
      stack.undo() // cursor at 'b'
      stack.undo() // cursor at 'a'
      stack.push(mockCommand("d")) // should truncate b,c
      expect(stack.commands.value.length).toBe(2) // a, d
      expect(stack.canRedo.value).toBe(false)
    })
  })

  describe("history depth cap", () => {
    test("prunes oldest command when exceeding maxDepth", () => {
      const smallStack = createUndoRedo(3)
      const a = mockCommand("a")
      const b = mockCommand("b")
      const c = mockCommand("c")
      const d = mockCommand("d")

      smallStack.push(a)
      smallStack.push(b)
      smallStack.push(c)
      expect(smallStack.commands.value.length).toBe(3)

      smallStack.push(d) // Should prune 'a'
      expect(smallStack.commands.value.length).toBe(3) // b, c, d
      expect(smallStack.commands.value[0].label).toBe("b")
    })

    test("fires onPruned callback when command is pruned", () => {
      const smallStack = createUndoRedo(2)
      let prunedCmd: Command | null = null
      smallStack.setOnPruned((cmd) => {
        prunedCmd = cmd
      })

      smallStack.push(mockCommand("a"))
      smallStack.push(mockCommand("b"))
      expect(prunedCmd).toBeNull()

      smallStack.push(mockCommand("c")) // prunes 'a'
      expect(prunedCmd).not.toBeNull()
      expect(prunedCmd!.label).toBe("a")
    })
  })

  describe("savedAtIndex / isEdited", () => {
    test("isEdited is false initially", () => {
      expect(stack.isEdited.value).toBe(false)
    })

    test("isEdited becomes true after push", () => {
      stack.push(mockCommand("a"))
      expect(stack.isEdited.value).toBe(true)
    })

    test("markSaved resets isEdited", () => {
      stack.push(mockCommand("a"))
      stack.markSaved()
      expect(stack.isEdited.value).toBe(false)
    })

    test("undo past saved point makes isEdited true", () => {
      stack.push(mockCommand("a"))
      stack.markSaved()
      stack.undo()
      expect(stack.isEdited.value).toBe(true)
    })

    test("redo back to saved point makes isEdited false", () => {
      stack.push(mockCommand("a"))
      stack.markSaved()
      stack.undo()
      stack.redo()
      expect(stack.isEdited.value).toBe(false)
    })

    test("savedAtIndex adjusts when commands are pruned", () => {
      const smallStack = createUndoRedo(3)
      smallStack.push(mockCommand("a"))
      smallStack.push(mockCommand("b"))
      smallStack.markSaved() // saved at index 1
      smallStack.push(mockCommand("c"))
      smallStack.push(mockCommand("d")) // prunes 'a', savedAtIndex becomes 0
      // After prune: [b, c, d], cursor at 2
      expect(smallStack.isEdited.value).toBe(true)
    })
  })

  describe("isOperationInProgress guard", () => {
    test("prevents undo when operation in progress", () => {
      const cmd = mockCommand("a")
      stack.push(cmd)
      stack.isOperationInProgress.value = true
      expect(stack.canUndo.value).toBe(false)
      stack.undo() // Should be no-op
      expect(cmd.undoCount).toBe(0)

      stack.isOperationInProgress.value = false
      expect(stack.canUndo.value).toBe(true)
    })

    test("prevents redo when operation in progress", () => {
      stack.push(mockCommand("a"))
      stack.undo()
      stack.isOperationInProgress.value = true
      expect(stack.canRedo.value).toBe(false)
    })
  })

  describe("clear", () => {
    test("resets everything", () => {
      stack.push(mockCommand("a"))
      stack.push(mockCommand("b"))
      stack.markSaved()
      stack.clear()

      expect(stack.commands.value.length).toBe(0)
      expect(stack.cursor.value).toBe(-1)
      expect(stack.canUndo.value).toBe(false)
      expect(stack.canRedo.value).toBe(false)
      expect(stack.isEdited.value).toBe(false)
    })
  })

  describe("compound command", () => {
    test("executes all sub-commands", () => {
      const a = mockCommand("a")
      const b = mockCommand("b")
      const compound = createCompoundCommand("batch", "svg", [a, b])

      stack.push(compound)
      expect(a.executeCount).toBe(1)
      expect(b.executeCount).toBe(1)
    })

    test("undoes sub-commands in reverse order", () => {
      const order: string[] = []
      const a: Command = {
        id: "1",
        label: "a",
        layer: "svg",
        execute() {
          order.push("exec-a")
        },
        undo() {
          order.push("undo-a")
        },
      }
      const b: Command = {
        id: "2",
        label: "b",
        layer: "svg",
        execute() {
          order.push("exec-b")
        },
        undo() {
          order.push("undo-b")
        },
      }

      const compound = createCompoundCommand("batch", "svg", [a, b])
      stack.push(compound)
      order.length = 0 // Reset after execute
      stack.undo()
      expect(order).toEqual(["undo-b", "undo-a"]) // Reverse order
    })
  })
})
