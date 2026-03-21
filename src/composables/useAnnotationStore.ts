import { shallowRef } from "vue"
import type { ShallowRef } from "vue"
import type { Annotation } from "../types/annotations"

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

  return {
    annotations: state.annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    insertAnnotation,
    getAnnotation,
  }
}
