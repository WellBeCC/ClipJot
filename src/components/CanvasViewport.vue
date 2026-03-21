<script setup lang="ts">
import { computed } from "vue"
import { useTabStore } from "../composables/useTabStore"
import { useAnnotationStore } from "../composables/useAnnotationStore"
import EmptyClipboard from "./EmptyClipboard.vue"
import RedactionCanvas from "./RedactionCanvas.vue"
import FreehandCanvas from "./FreehandCanvas.vue"
import SvgAnnotationLayer from "./SvgAnnotationLayer.vue"

const { activeTab } = useTabStore()

const hasImage = computed(() => activeTab.value?.imageUrl != null)

const annotationStore = computed(() =>
  activeTab.value ? useAnnotationStore(activeTab.value.annotationState) : null,
)

/**
 * Convert screen-space offset coordinates to image-space coordinates.
 * At 1:1 zoom with no pan, this is identity. When zoom/pan are added
 * (via useZoom's ViewportContext), this will account for CSS transforms.
 */
function screenToImage(
  sx: number,
  sy: number,
): { x: number; y: number } {
  return { x: sx, y: sy }
}
</script>

<template>
  <div class="canvas-viewport">
    <template v-if="hasImage && activeTab">
      <div class="canvas-viewport__layers">
        <img
          :src="activeTab.imageUrl!"
          :width="activeTab.imageWidth"
          :height="activeTab.imageHeight"
          class="canvas-viewport__base-image"
          alt="Clipboard image"
          draggable="false"
        />
        <!-- Redaction canvas stacks above base image (z:1 in layer model) -->
        <RedactionCanvas
          :redaction-state="activeTab.redactionState"
          :image-width="activeTab.imageWidth"
          :image-height="activeTab.imageHeight"
          :base-image-url="activeTab.imageUrl!"
        />
        <!-- Freehand canvas stacks above redaction (z:2 in layer model) -->
        <FreehandCanvas
          :drawing-state="activeTab.drawingState"
          :image-width="activeTab.imageWidth"
          :image-height="activeTab.imageHeight"
          :undo-redo-push="(cmd) => activeTab!.undoRedo.push(cmd)"
          :screen-to-image="screenToImage"
        />
        <!-- SVG annotation layer stacks above freehand (z:3 in layer model) -->
        <SvgAnnotationLayer
          v-if="annotationStore"
          :annotations="annotationStore.annotations.value"
          :image-width="activeTab.imageWidth"
          :image-height="activeTab.imageHeight"
        />
      </div>
    </template>
    <template v-else>
      <EmptyClipboard />
    </template>
  </div>
</template>

<style scoped>
.canvas-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--surface-canvas);
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-viewport__layers {
  position: relative;
  /* Will be transformed by zoom later */
}

.canvas-viewport__base-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
