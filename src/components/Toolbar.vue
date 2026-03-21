<script setup lang="ts">
// Placeholder — will receive tool buttons later
</script>

<template>
  <div class="toolbar">
    <span class="toolbar-placeholder">Toolbar</span>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 44px;
  padding: 4px 8px;
  background: var(--surface-panel);
  border-bottom: 1px solid var(--border-subtle);
}

.toolbar-placeholder {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
