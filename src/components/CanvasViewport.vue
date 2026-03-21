<script setup lang="ts">
// Placeholder — will host the image canvas and annotation layers
</script>

<template>
  <div class="canvas-viewport">
    <span class="canvas-placeholder">Canvas Viewport</span>
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

.canvas-placeholder {
  font-size: 1rem;
  color: var(--text-disabled);
}
</style>
