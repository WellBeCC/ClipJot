<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue"
import type { TextAnnotation } from "../types/annotations"
import { sanitizeHtml } from "../composables/useTextEditing"

const props = defineProps<{
  annotation: TextAnnotation
  /** Current viewport zoom scale (screen pixels per image pixel) */
  viewportScale: number
}>()

const emit = defineEmits<{
  commit: [annotationId: string, newHtml: string, width: number, height: number]
  cancel: [annotationId: string]
  delete: [annotationId: string]
  resize: [annotationId: string, width: number, height: number]
  "lock-width": [annotationId: string, width: number]
}>()

const editorRef = ref<HTMLDivElement | null>(null)

/**
 * Guard against the first blur that fires during the pointer event cycle
 * that created this editor. Without this, the browser pulls focus back
 * to the overlay after the click completes, triggering blur → empty text
 * → auto-delete before the user can type anything.
 */
let settlementComplete = false

/** Whether the user is currently dragging a resize handle */
let isResizing = false

onMounted(() => {
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.innerHTML = props.annotation.htmlContent
    }
    // Use setTimeout(0) to push focus to the end of the macrotask queue,
    // *after* the full pointer-event cycle (pointerdown → pointerup → click)
    // that created this editor has finished.  requestAnimationFrame fires
    // on paint timing and can run before that cycle settles, which lets the
    // browser yank focus away from the contenteditable.
    setTimeout(() => {
      if (editorRef.value) {
        editorRef.value.focus()
        // Place cursor at end of existing content
        const selection = window.getSelection()
        if (selection) {
          selection.selectAllChildren(editorRef.value)
          selection.collapseToEnd()
        }
      }
      // Allow blur to take effect only after focus is established
      requestAnimationFrame(() => {
        settlementComplete = true
      })
    }, 0)
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

  // Ignore blur caused by clicking a resize handle
  if (isResizing) {
    requestAnimationFrame(() => editorRef.value?.focus())
    return
  }

  // Ignore the spurious blur caused by the creation click cycle settling
  if (!settlementComplete) {
    // Re-focus after the event cycle completes
    requestAnimationFrame(() => editorRef.value?.focus())
    return
  }

  const html = sanitizeHtml(editorRef.value.innerHTML)

  // Strip tags and check if there's any actual text content
  const textOnly = html.replace(/<[^>]*>/g, "").trim()
  if (!textOnly) {
    // Empty text on blur → auto-delete annotation
    emit("delete", props.annotation.id)
    return
  }

  // When fixedWidth, preserve the user-set width; otherwise measure content
  const measuredWidth = props.annotation.fixedWidth
    ? props.annotation.width
    : Math.ceil(editorRef.value.scrollWidth)
  const measuredHeight = Math.ceil(editorRef.value.scrollHeight)

  emit("commit", props.annotation.id, html, measuredWidth, measuredHeight)
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

/** Emit live size so the SVG frame can track the editor dimensions */
function emitResize(): void {
  if (!editorRef.value) return
  // Only auto-resize when width is not locked
  if (props.annotation.fixedWidth) return
  const w = Math.ceil(editorRef.value.scrollWidth)
  const h = Math.ceil(editorRef.value.scrollHeight)
  emit("resize", props.annotation.id, w, h)
}

function onInput(): void {
  emitResize()
  // When fixedWidth, update height to match content
  if (props.annotation.fixedWidth && editorRef.value) {
    const h = Math.ceil(editorRef.value.scrollHeight)
    emit("resize", props.annotation.id, props.annotation.width, h)
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

// ── Resize handles ──────────────────────────────────────────────────────────

let dragStartX = 0
let dragStartWidth = 0
let dragHandle: "ml" | "mr" | null = null

function onHandlePointerDown(e: PointerEvent, handle: "ml" | "mr"): void {
  e.preventDefault()
  e.stopPropagation()
  isResizing = true
  dragHandle = handle
  dragStartX = e.clientX
  dragStartWidth = props.annotation.fixedWidth
    ? props.annotation.width
    : (editorRef.value?.offsetWidth ?? props.annotation.width)

  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  target.addEventListener("pointermove", onHandlePointerMove)
  target.addEventListener("pointerup", onHandlePointerUp)
}

function onHandlePointerMove(e: PointerEvent): void {
  // Convert screen-pixel delta to image-coordinate delta
  const delta = (e.clientX - dragStartX) / props.viewportScale
  let newWidth: number
  if (dragHandle === "mr") {
    newWidth = Math.max(40, dragStartWidth + delta)
  } else {
    // ml: growing left means subtracting delta
    newWidth = Math.max(40, dragStartWidth - delta)
  }
  emit("lock-width", props.annotation.id, Math.ceil(newWidth))
}

function onHandlePointerUp(e: PointerEvent): void {
  const target = e.currentTarget as HTMLElement
  target.removeEventListener("pointermove", onHandlePointerMove)
  target.removeEventListener("pointerup", onHandlePointerUp)
  target.releasePointerCapture(e.pointerId)
  dragHandle = null
  isResizing = false
  // Re-focus the editor after handle drag
  editorRef.value?.focus()
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
    class="text-editor-wrapper"
    :style="{
      left: annotation.x + 'px',
      top: annotation.y + 'px',
    }"
  >
    <div
      ref="editorRef"
      class="text-editor-overlay"
      contenteditable="true"
      :style="{
        width: annotation.fixedWidth ? annotation.width + 'px' : undefined,
        minWidth: annotation.fixedWidth ? undefined : '60px',
        minHeight: '1.4em',
        fontFamily: annotation.fontFamily,
        fontSize: annotation.fontSize + 'px',
        color: annotation.strokeColor,
        backgroundColor: annotation.fill ? annotation.fillColor : 'transparent',
      }"
      @blur="onBlur"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
    />
    <!-- Left resize handle -->
    <div
      class="text-editor-handle text-editor-handle--ml"
      @pointerdown="(e) => onHandlePointerDown(e, 'ml')"
    />
    <!-- Right resize handle -->
    <div
      class="text-editor-handle text-editor-handle--mr"
      @pointerdown="(e) => onHandlePointerDown(e, 'mr')"
    />
  </div>
</template>

<style scoped>
.text-editor-wrapper {
  position: absolute;
  z-index: 50;
  display: inline-flex;
  align-items: stretch;
}

.text-editor-overlay {
  padding: 4px;
  box-sizing: border-box;
  white-space: pre-wrap;
  line-height: 1.4;
  border: 1px dashed var(--interactive-focus);
  outline: none;
  cursor: text;
  caret-color: currentColor;
  overflow: visible;
  word-break: break-word;
}

.text-editor-handle {
  position: absolute;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  /* Subtle visual indicator on hover */
  background: transparent;
  transition: background 0.1s;
}

.text-editor-handle:hover,
.text-editor-handle:active {
  background: var(--interactive-focus);
  opacity: 0.3;
}

.text-editor-handle--ml {
  left: -4px;
}

.text-editor-handle--mr {
  right: -4px;
}
</style>
