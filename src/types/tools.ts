export type ToolId =
  | "select"
  | "pen"
  | "pencil"
  | "marker"
  | "eraser"
  | "arrow"
  | "line"
  | "rect"
  | "ellipse"
  | "callout"
  | "text"
  | "redact"
  | "crop"

export type FreehandToolId = "pen" | "pencil" | "marker" | "eraser"

export type ShapeToolId = "rect" | "ellipse"

export type LineToolId = "arrow" | "line"

export type RedactStyle = "solid" | "pixelate" | "blur"

/** Tools that have no sub-toolbar */
export type NoSettingsToolId = "select" | "crop"

export function isFreehandTool(tool: ToolId): tool is FreehandToolId {
  return (
    tool === "pen" ||
    tool === "pencil" ||
    tool === "marker" ||
    tool === "eraser"
  )
}

export function isShapeTool(tool: ToolId): tool is ShapeToolId {
  return tool === "rect" || tool === "ellipse"
}

export function isLineTool(tool: ToolId): tool is LineToolId {
  return tool === "arrow" || tool === "line"
}

/** Settings for shape tools (rect, ellipse) */
export interface ShapeToolSettings {
  color: string
  width: number
  fill: boolean
  fillColor: string
  fillOpacity: number
}

/** Settings for line tools (arrow, line) */
export interface LineToolSettings {
  color: string
  width: number
}

/** Settings for callout numbered markers */
export interface CalloutToolSettings {
  fillColor: string
  radius: number
}

/** Settings for text tool */
export interface TextToolSettings {
  fontSize: number
  color: string
}

/** Redaction effect strength: 1 = light, 2 = medium, 3 = strong */
export type RedactStrength = 1 | 2 | 3

/** Settings for redaction tool */
export interface RedactToolSettings {
  style: RedactStyle
  strength: RedactStrength
}

/** Map of tool ID to its settings type */
export interface ToolSettingsMap {
  pen: undefined // Uses FreehandToolSettings in useToolStore
  pencil: undefined
  marker: undefined
  eraser: undefined
  arrow: LineToolSettings
  line: LineToolSettings
  rect: ShapeToolSettings
  ellipse: ShapeToolSettings
  callout: CalloutToolSettings
  text: TextToolSettings
  redact: RedactToolSettings
  select: undefined
  crop: undefined
}
