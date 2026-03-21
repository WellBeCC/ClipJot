<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  icon: Component;
  label: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    class="action-btn"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    @click="emit('click')"
  >
    <component :is="icon" :size="18" :stroke-width="1.75" />
  </button>
</template>

<style scoped>
.action-btn {
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
    color 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--surface-elevated);
  color: var(--text-primary);
}

.action-btn:active:not(:disabled) {
  background: var(--interactive-active);
  color: var(--text-inverse);
}

.action-btn:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.action-btn:focus-visible {
  outline: 2px solid var(--interactive-default);
  outline-offset: 1px;
}
</style>
