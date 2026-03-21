<script setup lang="ts">
import type { Tab } from "../types/tab"

defineProps<{
  tab: Tab
  isActive: boolean
}>()

const emit = defineEmits<{
  select: [tabId: string]
}>()
</script>

<template>
  <button
    class="tab-item"
    :class="{
      'tab-item--active': isActive,
      'tab-item--clipboard': tab.type === 'clipboard',
      'tab-item--copied': tab.copiedSinceLastEdit,
    }"
    @click="emit('select', tab.id)"
  >
    <span class="tab-item__name">{{ tab.name }}</span>
    <span
      v-if="tab.copiedSinceLastEdit && tab.type !== 'clipboard'"
      class="tab-item__badge"
    />
  </button>
</template>

<style scoped>
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--tab-default);
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s;
}

.tab-item:hover {
  background: var(--surface-elevated);
}

.tab-item--active {
  color: var(--text-primary);
  background: var(--tab-active);
  border-bottom-color: var(--interactive-default);
}

.tab-item--clipboard {
  font-weight: 600;
}

.tab-item--clipboard.tab-item--active {
  border-bottom-color: var(--tab-clipboard);
}

.tab-item__name {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.tab-item__badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tab-copied);
  flex-shrink: 0;
}
</style>
