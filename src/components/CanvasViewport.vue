<script setup lang="ts">
import { computed } from "vue"
import { useTabStore } from "../composables/useTabStore"
import EmptyClipboard from "./EmptyClipboard.vue"

const { activeTab } = useTabStore()

const hasImage = computed(() => activeTab.value?.imageUrl != null)
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
        <!-- Future layers (redaction, freehand, SVG) will stack here -->
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
