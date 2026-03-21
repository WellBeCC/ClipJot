<script setup lang="ts">
import { computed } from "vue"
import { useToolStore } from "../composables/useToolStore"
import { isFreehandTool, isShapeTool, isLineTool } from "../types/tools"
import type { RedactStyle } from "../types/tools"
import ColorPicker from "./ColorPicker.vue"
import StrokeWidthSelector from "./StrokeWidthSelector.vue"
import OpacitySlider from "./OpacitySlider.vue"
import FillToggle from "./FillToggle.vue"
import RedactStylePicker from "./RedactStylePicker.vue"
import FontSizeSelector from "./FontSizeSelector.vue"
import CalloutSizeSelector from "./CalloutSizeSelector.vue"

const {
  activeTool,
  settingsVersion,
  getToolSettings,
  updateToolSettings,
  getShapeSettings,
  updateShapeSettings,
  getLineSettings,
  updateLineSettings,
  getCalloutSettings,
  updateCalloutSettings,
  getTextSettings,
  updateTextSettings,
  getRedactSettings,
  updateRedactSettings,
} = useToolStore()

/** Whether the sub-toolbar should be visible */
const isVisible = computed(() => {
  const tool = activeTool.value
  return tool !== "select" && tool !== "crop"
})

/** Which parameter sections to show for each tool */
const showColor = computed(() => {
  const tool = activeTool.value
  return (
    tool === "pen" ||
    tool === "pencil" ||
    tool === "marker" ||
    tool === "arrow" ||
    tool === "line" ||
    tool === "rect" ||
    tool === "ellipse" ||
    tool === "text"
  )
})

const showWidth = computed(() => {
  const tool = activeTool.value
  return (
    tool === "pen" ||
    tool === "pencil" ||
    tool === "marker" ||
    tool === "eraser" ||
    tool === "arrow" ||
    tool === "line" ||
    tool === "rect" ||
    tool === "ellipse"
  )
})

const showOpacity = computed(() => {
  return activeTool.value === "marker"
})

const showFill = computed(() => {
  return isShapeTool(activeTool.value)
})

const showFillColor = computed(() => {
  if (!isShapeTool(activeTool.value)) return false
  void settingsVersion.value
  return getShapeSettings(activeTool.value as "rect" | "ellipse").fill
})

const showFillOpacity = computed(() => {
  if (!isShapeTool(activeTool.value)) return false
  void settingsVersion.value
  return getShapeSettings(activeTool.value as "rect" | "ellipse").fill
})

const showCalloutColor = computed(() => activeTool.value === "callout")
const showCalloutSize = computed(() => activeTool.value === "callout")
const showFontSize = computed(() => activeTool.value === "text")
const showRedactStyle = computed(() => activeTool.value === "redact")

// ── Reactive getters (touch settingsVersion for reactivity) ──

const currentColor = computed(() => {
  void settingsVersion.value
  const tool = activeTool.value
  if (isFreehandTool(tool)) return getToolSettings(tool).color
  if (isShapeTool(tool)) return getShapeSettings(tool).color
  if (isLineTool(tool)) return getLineSettings(tool).color
  if (tool === "text") return getTextSettings().color
  return "#D14D41"
})

const currentWidth = computed(() => {
  void settingsVersion.value
  const tool = activeTool.value
  if (isFreehandTool(tool)) return getToolSettings(tool).width
  if (isShapeTool(tool)) return getShapeSettings(tool).width
  if (isLineTool(tool)) return getLineSettings(tool).width
  return 4
})

const currentOpacity = computed(() => {
  void settingsVersion.value
  if (activeTool.value === "marker") return getToolSettings("marker").opacity
  return 1
})

const currentFill = computed(() => {
  void settingsVersion.value
  const tool = activeTool.value
  if (isShapeTool(tool)) return getShapeSettings(tool).fill
  return false
})

const currentFillColor = computed(() => {
  void settingsVersion.value
  const tool = activeTool.value
  if (isShapeTool(tool)) return getShapeSettings(tool).fillColor
  return "#D14D41"
})

const currentFillOpacity = computed(() => {
  void settingsVersion.value
  const tool = activeTool.value
  if (isShapeTool(tool)) return getShapeSettings(tool).fillOpacity
  return 0.3
})

const currentCalloutColor = computed(() => {
  void settingsVersion.value
  return getCalloutSettings().fillColor
})

const currentCalloutSize = computed(() => {
  void settingsVersion.value
  return getCalloutSettings().radius
})

const currentFontSize = computed(() => {
  void settingsVersion.value
  return getTextSettings().fontSize
})

const currentRedactStyle = computed(() => {
  void settingsVersion.value
  return getRedactSettings().style
})

// ── Update handlers ──

function onColorChange(color: string): void {
  const tool = activeTool.value
  if (isFreehandTool(tool)) updateToolSettings(tool, { color })
  else if (isShapeTool(tool)) updateShapeSettings(tool, { color })
  else if (isLineTool(tool)) updateLineSettings(tool, { color })
  else if (tool === "text") updateTextSettings({ color })
}

function onWidthChange(width: number): void {
  const tool = activeTool.value
  if (isFreehandTool(tool)) updateToolSettings(tool, { width })
  else if (isShapeTool(tool)) updateShapeSettings(tool, { width })
  else if (isLineTool(tool)) updateLineSettings(tool, { width })
}

function onOpacityChange(opacity: number): void {
  if (activeTool.value === "marker") updateToolSettings("marker", { opacity })
}

function onFillChange(fill: boolean): void {
  const tool = activeTool.value
  if (isShapeTool(tool)) updateShapeSettings(tool, { fill })
}

function onFillColorChange(fillColor: string): void {
  const tool = activeTool.value
  if (isShapeTool(tool)) updateShapeSettings(tool, { fillColor })
}

function onFillOpacityChange(fillOpacity: number): void {
  const tool = activeTool.value
  if (isShapeTool(tool)) updateShapeSettings(tool, { fillOpacity })
}

function onCalloutColorChange(fillColor: string): void {
  updateCalloutSettings({ fillColor })
}

function onCalloutSizeChange(radius: number): void {
  updateCalloutSettings({ radius })
}

function onFontSizeChange(fontSize: number): void {
  updateTextSettings({ fontSize })
}

function onRedactStyleChange(style: RedactStyle): void {
  updateRedactSettings({ style })
}
</script>

<template>
  <div
    class="sub-toolbar"
    :class="{ 'sub-toolbar--hidden': !isVisible }"
    role="toolbar"
    aria-label="Tool settings"
  >
    <template v-if="isVisible">
      <!-- Color -->
      <div v-if="showColor" class="sub-toolbar__section" data-section="color">
        <span class="sub-toolbar__label">Color</span>
        <ColorPicker :model-value="currentColor" @update:model-value="onColorChange" />
      </div>

      <!-- Stroke width -->
      <div v-if="showWidth" class="sub-toolbar__section" data-section="width">
        <span class="sub-toolbar__label">Width</span>
        <StrokeWidthSelector :model-value="currentWidth" @update:model-value="onWidthChange" />
      </div>

      <!-- Opacity (marker) -->
      <div v-if="showOpacity" class="sub-toolbar__section" data-section="opacity">
        <span class="sub-toolbar__label">Opacity</span>
        <OpacitySlider :model-value="currentOpacity" @update:model-value="onOpacityChange" />
      </div>

      <!-- Fill toggle (shapes) -->
      <div v-if="showFill" class="sub-toolbar__section" data-section="fill">
        <FillToggle :model-value="currentFill" @update:model-value="onFillChange" />
      </div>

      <!-- Fill color (shapes, when fill enabled) -->
      <div v-if="showFillColor" class="sub-toolbar__section" data-section="fillColor">
        <span class="sub-toolbar__label">Fill</span>
        <ColorPicker :model-value="currentFillColor" @update:model-value="onFillColorChange" />
      </div>

      <!-- Fill opacity (shapes, when fill enabled) -->
      <div v-if="showFillOpacity" class="sub-toolbar__section" data-section="fillOpacity">
        <span class="sub-toolbar__label">Fill opacity</span>
        <OpacitySlider :model-value="currentFillOpacity" @update:model-value="onFillOpacityChange" />
      </div>

      <!-- Callout fill color -->
      <div v-if="showCalloutColor" class="sub-toolbar__section" data-section="calloutColor">
        <span class="sub-toolbar__label">Color</span>
        <ColorPicker :model-value="currentCalloutColor" @update:model-value="onCalloutColorChange" />
      </div>

      <!-- Callout size -->
      <div v-if="showCalloutSize" class="sub-toolbar__section" data-section="calloutSize">
        <span class="sub-toolbar__label">Size</span>
        <CalloutSizeSelector :model-value="currentCalloutSize" @update:model-value="onCalloutSizeChange" />
      </div>

      <!-- Font size (text) -->
      <div v-if="showFontSize" class="sub-toolbar__section" data-section="fontSize">
        <span class="sub-toolbar__label">Size</span>
        <FontSizeSelector :model-value="currentFontSize" @update:model-value="onFontSizeChange" />
      </div>

      <!-- Redact style -->
      <div v-if="showRedactStyle" class="sub-toolbar__section" data-section="redactStyle">
        <span class="sub-toolbar__label">Style</span>
        <RedactStylePicker :model-value="currentRedactStyle" @update:model-value="onRedactStyleChange" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.sub-toolbar {
  flex-shrink: 0;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 12px;
  background: var(--surface-app);
  border-bottom: 1px solid var(--border-subtle);
  overflow-x: auto;
  overflow-y: hidden;
  transition: height 0.15s ease, opacity 0.15s ease;
}

.sub-toolbar--hidden {
  height: 0;
  opacity: 0;
  border-bottom: none;
  pointer-events: none;
}

.sub-toolbar__section {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sub-toolbar__section + .sub-toolbar__section {
  padding-left: 12px;
  border-left: 1px solid var(--border-subtle);
}

.sub-toolbar__label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  user-select: none;
  white-space: nowrap;
}
</style>
