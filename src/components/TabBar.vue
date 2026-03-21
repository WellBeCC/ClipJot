<script setup lang="ts">
// Placeholder — will receive tab data and events later
</script>

<template>
  <div class="tab-bar">
    <span class="tab-placeholder">Clipboard</span>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  min-height: 36px;
  background: var(--surface-panel);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 8px;
  align-items: center;
}

.tab-placeholder {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
