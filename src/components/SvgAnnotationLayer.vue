<script setup lang="ts">
import type { Annotation, RectAnnotation } from "../types/annotations"
import { useSelection } from "../composables/useSelection"
import { getAnnotationBounds } from "../types/annotations"
import SelectionHandles from "./SelectionHandles.vue"

defineProps<{
  annotations: Annotation[]
  imageWidth: number
  imageHeight: number
}>()

const { selectedIds } = useSelection()

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
    :viewBox="`0 0 ${imageWidth} ${imageHeight}`"
    :width="imageWidth"
    :height="imageHeight"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Render each annotation based on type -->
    <g v-for="annotation in annotations" :key="annotation.id">
      <!-- Placeholder: actual annotation components will be added by Units 12-15 -->
      <!-- For now, render a simple rect outline for rect annotations -->
      <rect
        v-if="annotation.type === 'rect'"
        :x="annotation.x"
        :y="annotation.y"
        :width="(annotation as RectAnnotation).width"
        :height="(annotation as RectAnnotation).height"
        :stroke="annotation.strokeColor"
        :stroke-width="annotation.strokeWidth"
        :fill="
          (annotation as RectAnnotation).fill
            ? (annotation as RectAnnotation).fillColor
            : 'none'
        "
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
      />
    </template>
  </svg>
</template>

<style scoped>
.svg-annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: visible;
}
</style>
