<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue"
import type { TextAnnotation } from "../types/annotations"
import { sanitizeHtml } from "../composables/useTextEditing"

const props = defineProps<{
  annotation: TextAnnotation
}>()

const emit = defineEmits<{
  commit: [annotationId: string, newHtml: string]
  cancel: [annotationId: string]
  delete: [annotationId: string]
}>()

const editorRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.innerHTML = props.annotation.htmlContent
      editorRef.value.focus()
      // Move cursor to end
      const selection = window.getSelection()
      if (selection) {
        selection.selectAllChildren(editorRef.value)
        selection.collapseToEnd()
      }
    }
  })
})

// Update content if annotation changes externally
watch(
  () => props.annotation.htmlContent,
  (newContent) => {
    if (editorRef.value && editorRef.value.innerHTML !== newContent) {
      editorRef.value.innerHTML = newContent
    }
  },
)

function onBlur(): void {
  if (!editorRef.value) return

  const html = sanitizeHtml(editorRef.value.innerHTML)

  // Strip tags and check if there's any actual text content
  const textOnly = html.replace(/<[^>]*>/g, "").trim()
  if (!textOnly) {
    // Empty text on blur → auto-delete annotation
    emit("delete", props.annotation.id)
    return
  }

  emit("commit", props.annotation.id, html)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault()
    emit("cancel", props.annotation.id)
    return
  }

  // Bold
  if ((e.metaKey || e.ctrlKey) && e.key === "b") {
    e.preventDefault()
    document.execCommand("bold")
    return
  }

  // Italic
  if ((e.metaKey || e.ctrlKey) && e.key === "i") {
    e.preventDefault()
    document.execCommand("italic")
    return
  }

  // Underline
  if ((e.metaKey || e.ctrlKey) && e.key === "u") {
    e.preventDefault()
    document.execCommand("underline")
    return
  }
}

function onPaste(e: ClipboardEvent): void {
  e.preventDefault()

  const html = e.clipboardData?.getData("text/html")
  const text = e.clipboardData?.getData("text/plain") ?? ""

  if (html) {
    // Sanitize pasted HTML — strips everything except B/I/U/BR/SPAN(font-size,color)
    const clean = sanitizeHtml(html)
    document.execCommand("insertHTML", false, clean)
  } else {
    // Plain text: insert as-is (safe — no HTML)
    document.execCommand("insertText", false, text)
  }
}

// Cleanup: commit on unmount if still focused
onBeforeUnmount(() => {
  if (editorRef.value && document.activeElement === editorRef.value) {
    onBlur()
  }
})
</script>

<template>
  <div
    ref="editorRef"
    class="text-editor-overlay"
    contenteditable="true"
    :style="{
      left: annotation.x + 'px',
      top: annotation.y + 'px',
      width: annotation.width + 'px',
      minHeight: annotation.height + 'px',
      fontFamily: annotation.fontFamily,
      fontSize: annotation.fontSize + 'px',
      color: annotation.strokeColor,
      backgroundColor: annotation.fill ? annotation.fillColor : 'transparent',
      borderColor: annotation.strokeColor,
      borderWidth: annotation.strokeWidth + 'px',
    }"
    @blur="onBlur"
    @keydown="onKeydown"
    @paste="onPaste"
  />
</template>

<style scoped>
.text-editor-overlay {
  position: absolute;
  z-index: 50;
  padding: 4px;
  box-sizing: border-box;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
  outline: 2px solid var(--interactive-focus);
  outline-offset: 1px;
  border-style: solid;
  cursor: text;
  overflow: auto;
}
</style>
