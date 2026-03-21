export interface BaseAnnotation {
  id: string
  type: string
  x: number
  y: number
  rotation: number // degrees
  strokeColor: string // Resolved hex color (NOT CSS variable)
  strokeWidth: number
  selected: boolean
}

export interface RectAnnotation extends BaseAnnotation {
  type: "rect"
  width: number
  height: number
  fill: boolean
  fillColor: string
  fillOpacity: number
}

export interface EllipseAnnotation extends BaseAnnotation {
  type: "ellipse"
  width: number
  height: number
  fill: boolean
  fillColor: string
  fillOpacity: number
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow"
  endX: number
  endY: number
  controlX: number // Bezier control point (relative to midpoint)
  controlY: number
}

export interface LineAnnotation extends BaseAnnotation {
  type: "line"
  endX: number
  endY: number
}

export interface CalloutAnnotation extends BaseAnnotation {
  type: "callout"
  number: number
  radius: number
  fillColor: string
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text"
  width: number
  height: number
  htmlContent: string
  fontFamily: string
  fontSize: number
  fill: boolean
  fillColor: string
}

export type Annotation =
  | RectAnnotation
  | EllipseAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | CalloutAnnotation
  | TextAnnotation

export function assertNever(x: never): never {
  throw new Error(`Unexpected annotation type: ${JSON.stringify(x)}`)
}

/** Get bounding box for any annotation type */
export function getAnnotationBounds(annotation: Annotation): {
  x: number
  y: number
  width: number
  height: number
} {
  switch (annotation.type) {
    case "rect":
    case "ellipse":
    case "text":
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      }
    case "arrow":
    case "line": {
      const minX = Math.min(annotation.x, annotation.endX)
      const minY = Math.min(annotation.y, annotation.endY)
      return {
        x: minX,
        y: minY,
        width: Math.abs(annotation.endX - annotation.x),
        height: Math.abs(annotation.endY - annotation.y),
      }
    }
    case "callout":
      return {
        x: annotation.x - annotation.radius,
        y: annotation.y - annotation.radius,
        width: annotation.radius * 2,
        height: annotation.radius * 2,
      }
    default:
      return assertNever(annotation)
  }
}
