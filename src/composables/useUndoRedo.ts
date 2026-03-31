import { shallowRef, ref, computed } from "vue"
import type { ComputedRef, Ref, ShallowRef } from "vue"
import type { Command } from "../types/commands"

export interface UndoRedoInstance {
  /** Push a new command (executes it and adds to stack) */
  push(command: Command): void
  /** Undo the last command */
  undo(): void
  /** Redo the last undone command */
  redo(): void
  /** Whether undo is available */
  readonly canUndo: ComputedRef<boolean>
  /** Whether redo is available */
  readonly canRedo: ComputedRef<boolean>
  /** Whether the state has been edited since last save */
  readonly isEdited: ComputedRef<boolean>
  /** Mark current position as saved (for close-warning detection) */
  markSaved(): void
  /** Flag to prevent undo/redo during active operations */
  readonly isOperationInProgress: Ref<boolean>
  /** Set callback for when a command is pruned from history */
  setOnPruned(callback: ((command: Command) => void) | null): void
  /** Set callback for when a command is pushed (edit made) */
  setOnPush(callback: (() => void) | null): void
  /** Clear all history (for tab close cleanup) */
  clear(): void
  /** Get the current cursor position */
  readonly cursor: Ref<number>
  /** Get the commands array (read-only for inspection) */
  readonly commands: ShallowRef<Command[]>
}

/**
 * Creates a new undo/redo stack instance.
 * Each tab should have its own instance.
 *
 * Uses cursor-based stack: commands[0..cursor] are the undo history,
 * commands[cursor+1..] are the redo future (if any).
 */
export function createUndoRedo(maxDepth = 50): UndoRedoInstance {
  const commands = shallowRef<Command[]>([])
  const cursor = ref(-1)
  const savedAtIndex = ref(-1)
  const isOperationInProgress = ref(false)
  let onPruned: ((command: Command) => void) | null = null
  let onPush: (() => void) | null = null

  const canUndo = computed(
    () => cursor.value >= 0 && !isOperationInProgress.value,
  )
  const canRedo = computed(
    () =>
      cursor.value < commands.value.length - 1 &&
      !isOperationInProgress.value,
  )
  const isEdited = computed(() => cursor.value !== savedAtIndex.value)

  function push(command: Command): void {
    const newStack = commands.value.slice(0, cursor.value + 1)
    newStack.push(command)

    if (newStack.length > maxDepth) {
      const pruned = newStack.shift()!
      if (savedAtIndex.value >= 0) {
        savedAtIndex.value--
      }
      onPruned?.(pruned)
    } else {
      cursor.value++
    }

    commands.value = newStack
    command.execute()
    onPush?.()
  }

  function undo(): void {
    if (!canUndo.value) return
    const command = commands.value[cursor.value]
    command.undo()
    cursor.value--
  }

  function redo(): void {
    if (!canRedo.value) return
    cursor.value++
    const command = commands.value[cursor.value]
    command.execute()
  }

  function markSaved(): void {
    savedAtIndex.value = cursor.value
  }

  function setOnPruned(callback: ((command: Command) => void) | null): void {
    onPruned = callback
  }

  function setOnPush(callback: (() => void) | null): void {
    onPush = callback
  }

  function clear(): void {
    commands.value = []
    cursor.value = -1
    savedAtIndex.value = -1
    onPruned = null
    onPush = null
  }

  return {
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    isEdited,
    markSaved,
    isOperationInProgress,
    setOnPruned,
    setOnPush,
    clear,
    cursor,
    commands,
  }
}
