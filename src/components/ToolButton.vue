<script setup lang="ts">
import type { Component } from "vue";
import type { ToolId } from "../types/tools";

defineProps<{
  toolId: ToolId;
  icon: Component;
  label: string;
  isActive: boolean;
}>();

const emit = defineEmits<{
  select: [toolId: ToolId];
}>();
</script>

<template>
  <button
    class="tool-btn"
    :class="{ 'tool-btn--active': isActive }"
    :title="label"
    :aria-label="label"
    :aria-pressed="isActive"
    @click="emit('select', toolId)"
  >
    <component :is="icon" :size="18" :stroke-width="1.75" />
  </button>
</template>

<style scoped>
.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.tool-btn:hover {
  background: var(--surface-elevated);
  color: var(--text-primary);
}

.tool-btn--active {
  background: var(--interactive-active);
  color: var(--text-inverse);
  border-color: var(--interactive-active);
}

.tool-btn--active:hover {
  background: var(--interactive-hover);
  border-color: var(--interactive-hover);
}

.tool-btn:focus-visible {
  outline: 2px solid var(--interactive-default);
  outline-offset: 1px;
}
</style>
