<script setup lang="ts">
import type { TextAnnotation } from "../../types/annotations"

const props = defineProps<{
  annotation: TextAnnotation
  isEditing: boolean
}>()

const emit = defineEmits<{
  select: [id: string, additive: boolean]
  "start-editing": [id: string]
}>()

function onPointerDown(e: PointerEvent): void {
  e.stopPropagation()
  emit("select", props.annotation.id, e.shiftKey || e.metaKey)
}

function onDoubleClick(e: MouseEvent): void {
  e.stopPropagation()
  emit("start-editing", props.annotation.id)
}
</script>

<template>
  <g
    class="text-annotation"
    :data-annotation-id="annotation.id"
    @pointerdown="onPointerDown"
    @dblclick="onDoubleClick"
  >
    <!--
      Hit area — always present for pointer events.
      Dashed frame only visible while editing (the TextEditor overlay draws
      its own border) or when the annotation has no content yet.
    -->
    <rect
      :x="annotation.x"
      :y="annotation.y"
      :width="annotation.width"
      :height="annotation.height"
      :fill="annotation.fill ? annotation.fillColor : 'transparent'"
      :stroke="isEditing || !annotation.htmlContent ? '#B7B5AC' : 'none'"
      stroke-width="1"
      stroke-dasharray="4 3"
      class="text-hit-area"
    />

    <!-- Display-only foreignObject for text preview (hidden while editing) -->
    <foreignObject
      v-if="!isEditing && annotation.htmlContent"
      :x="annotation.x"
      :y="annotation.y"
      :width="annotation.width"
      :height="annotation.height"
      :style="{ overflow: annotation.fixedWidth ? 'hidden' : 'visible' }"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        class="text-preview"
        :style="{
          fontFamily: annotation.fontFamily,
          fontSize: annotation.fontSize + 'px',
          color: annotation.strokeColor,
          pointerEvents: 'none',
          userSelect: 'none',
          padding: '4px',
          boxSizing: 'border-box',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.4',
        }"
        v-html="annotation.htmlContent"
      />
    </foreignObject>
  </g>
</template>

<style scoped>
.text-hit-area {
  pointer-events: fill;
  cursor: text;
}
</style>
