import { shallowRef } from "vue"
import type { ShallowRef } from "vue"
import type { Annotation, CalloutAnnotation } from "../types/annotations"

export interface AnnotationStoreState {
  annotations: ShallowRef<Annotation[]>
}

export function createAnnotationState(): AnnotationStoreState {
  return {
    annotations: shallowRef<Annotation[]>([]),
  }
}

export function useAnnotationStore(state: AnnotationStoreState) {
  function addAnnotation(annotation: Annotation): void {
    state.annotations.value = [...state.annotations.value, annotation]
  }

  function removeAnnotation(id: string): Annotation | undefined {
    const found = state.annotations.value.find((a) => a.id === id)
    if (found) {
      state.annotations.value = state.annotations.value.filter(
        (a) => a.id !== id,
      )
    }
    return found
  }

  function updateAnnotation(
    id: string,
    patch: Partial<Annotation>,
  ): void {
    state.annotations.value = state.annotations.value.map((a) =>
      a.id === id ? ({ ...a, ...patch } as Annotation) : a,
    )
  }

  function insertAnnotation(annotation: Annotation, index: number): void {
    const arr = [...state.annotations.value]
    arr.splice(index, 0, annotation)
    state.annotations.value = arr
  }

  function getAnnotation(id: string): Annotation | undefined {
    return state.annotations.value.find((a) => a.id === id)
  }

  /** Returns the next sequential callout number (max existing + 1, or 1 if none). */
  function getNextCalloutNumber(): number {
    let max = 0
    for (const a of state.annotations.value) {
      if (a.type === "callout" && a.number > max) {
        max = a.number
      }
    }
    return max + 1
  }

  /** Reassign callout numbers 1, 2, 3... in array (creation) order. */
  function renumberCallouts(): void {
    let seq = 1
    let changed = false
    const updated = state.annotations.value.map((a) => {
      if (a.type === "callout") {
        if (a.number !== seq) {
          changed = true
          const renumbered: CalloutAnnotation = { ...a, number: seq }
          seq++
          return renumbered
        }
        seq++
      }
      return a
    })
    if (changed) {
      state.annotations.value = updated
    }
  }

  return {
    annotations: state.annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    insertAnnotation,
    getAnnotation,
    getNextCalloutNumber,
    renumberCallouts,
  }
}
