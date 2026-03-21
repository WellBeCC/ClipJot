<script setup lang="ts">
// Placeholder — will show contextual options for the active tool
</script>

<template>
  <div class="sub-toolbar">
    <span class="sub-toolbar-placeholder">Sub-toolbar</span>
  </div>
</template>

<style scoped>
.sub-toolbar {
  flex-shrink: 0;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--surface-app);
  border-bottom: 1px solid var(--border-subtle);
  overflow: hidden;
  transition: height 0.15s ease;
}

.sub-toolbar-placeholder {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
