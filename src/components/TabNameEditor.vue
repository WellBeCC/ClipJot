<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue"

const props = defineProps<{
  currentName: string
}>()

const emit = defineEmits<{
  confirm: [name: string]
  cancel: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const value = ref(props.currentName)

onMounted(async () => {
  await nextTick()
  inputRef.value?.select()
})

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === "Enter") {
    emit("confirm", value.value)
  } else if (e.key === "Escape") {
    emit("cancel")
  }
}
</script>

<template>
  <input
    ref="inputRef"
    v-model="value"
    class="tab-name-editor"
    type="text"
    @keydown="handleKeydown"
    @blur="emit('confirm', value)"
  />
</template>

<style scoped>
.tab-name-editor {
  width: 100px;
  padding: 2px 4px;
  font-size: 13px;
  font-family: inherit;
  background: var(--surface-elevated);
  border: 1px solid var(--interactive-default);
  border-radius: 3px;
  color: var(--text-primary);
  outline: none;
}
</style>
