import { ref, computed } from "vue"
import type { StrokeOptions } from "perfect-freehand"
import type { ToolId, FreehandToolId } from "../types/tools"

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

// Module-level singleton for active tool
const activeTool = ref<ToolId>("pen")

// Module-level per-tool settings (deep-cloned from defaults)
const toolSettings: Record<FreehandToolId, FreehandToolSettings> = {
  pen: structuredClone(FREEHAND_DEFAULTS.pen),
  pencil: structuredClone(FREEHAND_DEFAULTS.pencil),
  marker: structuredClone(FREEHAND_DEFAULTS.marker),
  eraser: structuredClone(FREEHAND_DEFAULTS.eraser),
}

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
  }
}
