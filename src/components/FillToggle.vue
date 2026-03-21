<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [enabled: boolean]
}>()

function toggle(): void {
  emit("update:modelValue", !props.modelValue)
}
</script>

<template>
  <label class="fill-toggle" role="group" aria-label="Fill toggle">
    <input
      type="checkbox"
      class="fill-toggle__input"
      :checked="modelValue"
      aria-label="Enable fill"
      @change="toggle"
    />
    <span class="fill-toggle__label">Fill</span>
  </label>
</template>

<style scoped>
.fill-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
}

.fill-toggle__input {
  width: 14px;
  height: 14px;
  accent-color: var(--interactive-default);
  cursor: pointer;
}

.fill-toggle__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>
