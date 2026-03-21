import { ref, computed } from "vue"
import type { StrokeOptions } from "perfect-freehand"
import type {
  ToolId,
  FreehandToolId,
  ShapeToolId,
  LineToolId,
  ShapeToolSettings,
  LineToolSettings,
  CalloutToolSettings,
  TextToolSettings,
  RedactToolSettings,
} from "../types/tools"

export interface FreehandToolSettings {
  color: string
  width: number
  opacity: number
  strokeOptions: StrokeOptions
}

/** Default settings per freehand tool */
const FREEHAND_DEFAULTS: Record<FreehandToolId, FreehandToolSettings> = {
  pen: {
    color: "#D14D41",
    width: 4,
    opacity: 1,
    strokeOptions: {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
    },
  },
  pencil: {
    color: "#AF3029",
    width: 2,
    opacity: 1,
    strokeOptions: {
      size: 2,
      thinning: 0.7,
      smoothing: 0.3,
      streamline: 0.3,
      simulatePressure: true,
    },
  },
  marker: {
    color: "#D0A215",
    width: 20,
    opacity: 0.4,
    strokeOptions: {
      size: 20,
      thinning: 0,
      smoothing: 0.7,
      streamline: 0.5,
      simulatePressure: false,
    },
  },
  eraser: {
    color: "#000000",
    width: 20,
    opacity: 1,
    strokeOptions: {
      size: 20,
      thinning: 0,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
    },
  },
}

const SHAPE_DEFAULTS: Record<ShapeToolId, ShapeToolSettings> = {
  rect: {
    color: "#D14D41",
    width: 2,
    fill: false,
    fillColor: "#D14D41",
    fillOpacity: 0.3,
  },
  ellipse: {
    color: "#4385BE",
    width: 2,
    fill: false,
    fillColor: "#4385BE",
    fillOpacity: 0.3,
  },
}

const LINE_DEFAULTS: Record<LineToolId, LineToolSettings> = {
  arrow: {
    color: "#D14D41",
    width: 2,
  },
  line: {
    color: "#D14D41",
    width: 2,
  },
}

const CALLOUT_DEFAULTS: CalloutToolSettings = {
  fillColor: "#D14D41",
  radius: 14,
}

const TEXT_DEFAULTS: TextToolSettings = {
  fontSize: 16,
  color: "#100F0F",
}

const REDACT_DEFAULTS: RedactToolSettings = {
  style: "solid",
}

// Module-level singleton for active tool
const activeTool = ref<ToolId>("pen")

// Module-level per-tool settings (deep-cloned from defaults)
const toolSettings: Record<FreehandToolId, FreehandToolSettings> = {
  pen: structuredClone(FREEHAND_DEFAULTS.pen),
  pencil: structuredClone(FREEHAND_DEFAULTS.pencil),
  marker: structuredClone(FREEHAND_DEFAULTS.marker),
  eraser: structuredClone(FREEHAND_DEFAULTS.eraser),
}

const shapeSettings: Record<ShapeToolId, ShapeToolSettings> = {
  rect: structuredClone(SHAPE_DEFAULTS.rect),
  ellipse: structuredClone(SHAPE_DEFAULTS.ellipse),
}

const lineSettings: Record<LineToolId, LineToolSettings> = {
  arrow: structuredClone(LINE_DEFAULTS.arrow),
  line: structuredClone(LINE_DEFAULTS.line),
}

const calloutSettings: CalloutToolSettings = structuredClone(CALLOUT_DEFAULTS)
const textSettings: TextToolSettings = structuredClone(TEXT_DEFAULTS)
const redactSettings: RedactToolSettings = structuredClone(REDACT_DEFAULTS)

// Reactive version counter to trigger computed recalculation on settings update
const settingsVersion = ref(0)

/** Get current settings for a freehand tool */
function getToolSettings(toolId: FreehandToolId): FreehandToolSettings {
  return toolSettings[toolId]
}

/** Update settings for a freehand tool (partial patch) */
function updateToolSettings(
  toolId: FreehandToolId,
  patch: Partial<FreehandToolSettings>,
): void {
  const current = toolSettings[toolId]
  if (patch.color !== undefined) current.color = patch.color
  if (patch.width !== undefined) {
    current.width = patch.width
    current.strokeOptions = { ...current.strokeOptions, size: patch.width }
  }
  if (patch.opacity !== undefined) current.opacity = patch.opacity
  if (patch.strokeOptions !== undefined) {
    current.strokeOptions = { ...current.strokeOptions, ...patch.strokeOptions }
  }
  settingsVersion.value++
}

/** Get current settings for a shape tool */
function getShapeSettings(toolId: ShapeToolId): ShapeToolSettings {
  return shapeSettings[toolId]
}

/** Update settings for a shape tool (partial patch) */
function updateShapeSettings(
  toolId: ShapeToolId,
  patch: Partial<ShapeToolSettings>,
): void {
  const current = shapeSettings[toolId]
  if (patch.color !== undefined) current.color = patch.color
  if (patch.width !== undefined) current.width = patch.width
  if (patch.fill !== undefined) current.fill = patch.fill
  if (patch.fillColor !== undefined) current.fillColor = patch.fillColor
  if (patch.fillOpacity !== undefined) current.fillOpacity = patch.fillOpacity
  settingsVersion.value++
}

/** Get current settings for a line tool */
function getLineSettings(toolId: LineToolId): LineToolSettings {
  return lineSettings[toolId]
}

/** Update settings for a line tool (partial patch) */
function updateLineSettings(
  toolId: LineToolId,
  patch: Partial<LineToolSettings>,
): void {
  const current = lineSettings[toolId]
  if (patch.color !== undefined) current.color = patch.color
  if (patch.width !== undefined) current.width = patch.width
  settingsVersion.value++
}

/** Get current callout settings */
function getCalloutSettings(): CalloutToolSettings {
  return calloutSettings
}

/** Update callout settings (partial patch) */
function updateCalloutSettings(patch: Partial<CalloutToolSettings>): void {
  if (patch.fillColor !== undefined) calloutSettings.fillColor = patch.fillColor
  if (patch.radius !== undefined) calloutSettings.radius = patch.radius
  settingsVersion.value++
}

/** Get current text settings */
function getTextSettings(): TextToolSettings {
  return textSettings
}

/** Update text settings (partial patch) */
function updateTextSettings(patch: Partial<TextToolSettings>): void {
  if (patch.fontSize !== undefined) textSettings.fontSize = patch.fontSize
  if (patch.color !== undefined) textSettings.color = patch.color
  settingsVersion.value++
}

/** Get current redact settings */
function getRedactSettings(): RedactToolSettings {
  return redactSettings
}

/** Update redact settings (partial patch) */
function updateRedactSettings(patch: Partial<RedactToolSettings>): void {
  if (patch.style !== undefined) redactSettings.style = patch.style
  settingsVersion.value++
}

export function useToolStore() {
  function setTool(tool: ToolId): void {
    activeTool.value = tool
  }

  /** Computed settings for the currently active freehand tool (pen as fallback) */
  const activeToolSettings = computed<FreehandToolSettings>(() => {
    // Touch settingsVersion so this recomputes on updateToolSettings
    void settingsVersion.value
    const tool = activeTool.value
    if (tool === "pen" || tool === "pencil" || tool === "marker" || tool === "eraser") {
      return toolSettings[tool]
    }
    // Fallback for non-freehand tools
    return toolSettings.pen
  })

  return {
    activeTool,
    setTool,
    getToolSettings,
    updateToolSettings,
    activeToolSettings,
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
    settingsVersion,
  }
}
