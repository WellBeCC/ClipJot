<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useSelection } from "../composables/useSelection"
import { useTabStore } from "../composables/useTabStore"
import { useAnnotationStore } from "../composables/useAnnotationStore"
import { getAnnotationBounds } from "../types/annotations"
import type { Annotation } from "../types/annotations"
import { createSvgMutateCommand } from "../commands/SvgMutateCommand"
import ColorPicker from "./ColorPicker.vue"
import StrokeWidthSelector from "./StrokeWidthSelector.vue"
import OpacitySlider from "./OpacitySlider.vue"
import FillToggle from "./FillToggle.vue"

const { selectedIds } = useSelection()
const { activeTab } = useTabStore()

const store = computed(() =>
  activeTab.value ? useAnnotationStore(activeTab.value.annotationState) : null,
)

/** The single selected annotation (null if 0 or 2+ selected) */
const selectedAnnotation = computed<Annotation | null>(() => {
  if (selectedIds.value.size !== 1) return null
  const id = [...selectedIds.value][0]
  return store.value?.getAnnotation(id) ?? null
})

const visible = computed(() => selectedAnnotation.value !== null)

/** Whether the annotation supports fill (rect, ellipse) */
const hasFill = computed(() => {
  const a = selectedAnnotation.value
  return a !== null && (a.type === "rect" || a.type === "ellipse")
})

/** Whether the annotation supports opacity (rect, ellipse fill opacity) */
const hasOpacity = computed(() => {
  const a = selectedAnnotation.value
  return a !== null && (a.type === "rect" || a.type === "ellipse")
})

/** Whether stroke width is editable (not callout — callout uses radius) */
const hasStrokeWidth = computed(() => {
  const a = selectedAnnotation.value
  return a !== null && a.type !== "callout" && a.type !== "text"
})

// ── Positioning ──
const panelStyle = ref<Record<string, string>>({})

watch(
  selectedAnnotation,
  (annotation) => {
    if (!annotation) return
    const bounds = getAnnotationBounds(annotation)
    const PANEL_HEIGHT = 72
    const PANEL_WIDTH = 260
    const GAP = 8

    // Default: position above the annotation
    let top = bounds.y - PANEL_HEIGHT - GAP
    let left = bounds.x + bounds.width / 2 - PANEL_WIDTH / 2

    // If above would go off-screen, position below
    if (top < 0) {
      top = bounds.y + bounds.height + GAP
    }

    // Clamp left to stay within a reasonable area
    if (left < 4) left = 4

    panelStyle.value = {
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      zIndex: "30",
    }
  },
  { immediate: true },
)

// ── Property change handlers with undo support ──

function commitChange(field: string, before: unknown, after: unknown): void {
  const annotation = selectedAnnotation.value
  if (!annotation || !store.value || !activeTab.value) return

  const cmd = createSvgMutateCommand(
    annotation.id,
    { [field]: before } as Partial<Annotation>,
    { [field]: after } as Partial<Annotation>,
    store.value.updateAnnotation,
  )
  activeTab.value.undoRedo.push(cmd)
}

function onColorChange(color: string): void {
  const a = selectedAnnotation.value
  if (!a) return
  commitChange("strokeColor", a.strokeColor, color)
}

function onWidthChange(width: number): void {
  const a = selectedAnnotation.value
  if (!a) return
  commitChange("strokeWidth", a.strokeWidth, width)
}

function onFillChange(fill: boolean): void {
  const a = selectedAnnotation.value
  if (!a || (a.type !== "rect" && a.type !== "ellipse")) return
  commitChange("fill", a.fill, fill)
}

function onOpacityChange(opacity: number): void {
  const a = selectedAnnotation.value
  if (!a || (a.type !== "rect" && a.type !== "ellipse")) return
  commitChange("fillOpacity", a.fillOpacity, opacity)
}
</script>

<template>
  <div
    v-if="visible && selectedAnnotation"
    class="contextual-panel"
    :style="panelStyle"
    role="toolbar"
    aria-label="Annotation properties"
  >
    <div class="contextual-panel__section" data-section="color">
      <ColorPicker
        :model-value="selectedAnnotation.strokeColor"
        @update:model-value="onColorChange"
      />
    </div>

    <div
      v-if="hasStrokeWidth"
      class="contextual-panel__section"
      data-section="width"
    >
      <StrokeWidthSelector
        :model-value="selectedAnnotation.strokeWidth"
        @update:model-value="onWidthChange"
      />
    </div>

    <div
      v-if="hasFill && (selectedAnnotation.type === 'rect' || selectedAnnotation.type === 'ellipse')"
      class="contextual-panel__section"
      data-section="fill"
    >
      <FillToggle
        :model-value="selectedAnnotation.fill"
        @update:model-value="onFillChange"
      />
    </div>

    <div
      v-if="hasOpacity && (selectedAnnotation.type === 'rect' || selectedAnnotation.type === 'ellipse')"
      class="contextual-panel__section"
      data-section="opacity"
    >
      <OpacitySlider
        :model-value="selectedAnnotation.fillOpacity"
        @update:model-value="onOpacityChange"
      />
    </div>
  </div>
</template>

<style scoped>
.contextual-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  pointer-events: auto;
  white-space: nowrap;
}

.contextual-panel__section {
  display: flex;
  align-items: center;
}

.contextual-panel__section + .contextual-panel__section {
  padding-left: 8px;
  border-left: 1px solid var(--border-subtle);
}
</style>
