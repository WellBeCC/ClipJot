<script setup lang="ts">
import { computed } from "vue"
import type {
  Annotation,
  RectAnnotation as RectAnnotationType,
  EllipseAnnotation as EllipseAnnotationType,
  ArrowAnnotation as ArrowAnnotationType,
  LineAnnotation as LineAnnotationType,
  CalloutAnnotation as CalloutAnnotationType,
  TextAnnotation as TextAnnotationType,
} from "../types/annotations"
import { useSelection } from "../composables/useSelection"
import { useToolStore } from "../composables/useToolStore"
import { useTextEditing } from "../composables/useTextEditing"
import { getAnnotationBounds } from "../types/annotations"
import SelectionHandles from "./SelectionHandles.vue"
import RectAnnotation from "./annotations/RectAnnotation.vue"
import EllipseAnnotation from "./annotations/EllipseAnnotation.vue"
import ArrowAnnotation from "./annotations/ArrowAnnotation.vue"
import LineAnnotation from "./annotations/LineAnnotation.vue"
import CalloutAnnotation from "./annotations/CalloutAnnotation.vue"
import TextAnnotation from "./annotations/TextAnnotation.vue"

defineProps<{
  annotations: Annotation[]
  imageWidth: number
  imageHeight: number
}>()

const emit = defineEmits<{
  "start-text-editing": [id: string]
  "resize-text": [annotationId: string, width: number, newX: number]
  "update-annotation": [annotationId: string, patch: Partial<Annotation>]
  "commit-annotation-update": [
    annotationId: string,
    before: Partial<Annotation>,
    after: Partial<Annotation>,
  ]
}>()

const { editingAnnotationId } = useTextEditing()

function onStartTextEditing(id: string): void {
  emit("start-text-editing", id)
}

const { selectedIds, select, deselect } = useSelection()
const { activeTool } = useToolStore()

/** Whether the SVG layer should be interactive (select tool active) */
const isSelectMode = computed(() => activeTool.value === "select")

function onAnnotationSelect(id: string, additive: boolean): void {
  select(id, additive)
}

/** Deselect all when clicking empty SVG background in select mode */
function onBackgroundPointerDown(): void {
  if (isSelectMode.value) {
    deselect()
  }
}

function onResizeText(annotationId: string, width: number, newX: number): void {
  emit("resize-text", annotationId, width, newX)
}

function onUpdateAnnotation(annotationId: string, patch: Partial<Annotation>): void {
  emit("update-annotation", annotationId, patch)
}

function onCommitAnnotationUpdate(
  annotationId: string,
  before: Partial<Annotation>,
  after: Partial<Annotation>,
): void {
  emit("commit-annotation-update", annotationId, before, after)
}

function getSelectedAnnotation(
  id: string,
  annotations: Annotation[],
): Annotation | undefined {
  return annotations.find((a) => a.id === id)
}
</script>

<template>
  <svg
    class="svg-annotation-layer"
    :class="{ 'svg-annotation-layer--select-mode': isSelectMode }"
    :viewBox="`0 0 ${imageWidth} ${imageHeight}`"
    xmlns="http://www.w3.org/2000/svg"
    @pointerdown.self="onBackgroundPointerDown"
  >
    <!-- Render each annotation based on type -->
    <g v-for="annotation in annotations" :key="annotation.id">
      <!-- Rectangle annotation -->
      <RectAnnotation
        v-if="annotation.type === 'rect'"
        :annotation="annotation as RectAnnotationType"
        @select="onAnnotationSelect"
      />

      <!-- Ellipse annotation -->
      <EllipseAnnotation
        v-else-if="annotation.type === 'ellipse'"
        :annotation="annotation as EllipseAnnotationType"
        @select="onAnnotationSelect"
      />

      <!-- Arrow annotation (quadratic Bezier with arrowhead) -->
      <ArrowAnnotation
        v-else-if="annotation.type === 'arrow'"
        :annotation="annotation as ArrowAnnotationType"
        @select="onAnnotationSelect"
      />

      <!-- Line annotation (simple straight line) -->
      <LineAnnotation
        v-else-if="annotation.type === 'line'"
        :annotation="annotation as LineAnnotationType"
        @select="onAnnotationSelect"
      />

      <!-- Callout annotation (numbered circle) -->
      <CalloutAnnotation
        v-else-if="annotation.type === 'callout'"
        :annotation="annotation as CalloutAnnotationType"
      />

      <!-- Text annotation (rich text box) -->
      <TextAnnotation
        v-else-if="annotation.type === 'text'"
        :annotation="annotation as TextAnnotationType"
        :is-editing="editingAnnotationId === annotation.id"
        @select="onAnnotationSelect"
        @start-editing="onStartTextEditing"
      />
    </g>

    <!-- Selection handles for selected annotations -->
    <template v-for="id in selectedIds" :key="'handles-' + id">
      <SelectionHandles
        v-if="getSelectedAnnotation(id, annotations)"
        :annotation="getSelectedAnnotation(id, annotations)!"
        :bounds="
          getAnnotationBounds(getSelectedAnnotation(id, annotations)!)
        "
        @resize-text="onResizeText"
        @update="onUpdateAnnotation"
        @update-commit="onCommitAnnotationUpdate"
      />
    </template>
  </svg>
</template>

<style scoped>
.svg-annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 4;
  pointer-events: none;
  overflow: visible;
}

.svg-annotation-layer--select-mode {
  pointer-events: auto;
  cursor: default;
}
</style>
