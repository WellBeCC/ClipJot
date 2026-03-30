import { ref } from "vue"

/** Annotation ID currently being edited, or null if none. */
const editingAnnotationId = ref<string | null>(null)

/** Snapshot of htmlContent before the current edit session (for undo). */
const editingSnapshot = ref<string>("")

/**
 * Tags allowed through the HTML sanitizer.
 * Everything else is stripped (content preserved, tags removed).
 */
const ALLOWED_TAGS = new Set(["b", "i", "u", "br", "span"])

/**
 * Style properties allowed on `<span>` elements.
 * All other style properties are stripped.
 */
const ALLOWED_STYLE_PROPS = new Set(["font-size", "color"])

/**
 * Sanitize HTML content for safe storage and display.
 *
 * Security (Appendix C.2 — XSS Prevention):
 * - Strips ALL tags except: <b>, <i>, <u>, <br>, <span>
 * - Strips ALL attributes except `style` on <span>
 * - From `style`, only keeps `font-size` and `color`
 * - Removes script tags, event handlers, iframes, etc.
 * - Pure-string allowlist approach — no DOM dependency.
 */
export function sanitizeHtml(dirty: string): string {
  // First pass: remove script/style/iframe blocks entirely (content + tags)
  let html = dirty.replace(
    /<(script|style|iframe|object|embed|form|input|textarea|select|button|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  )
  // Also remove self-closing variants and unclosed dangerous tags
  html = html.replace(
    /<(script|style|iframe|object|embed|form|input|textarea|select|button|link|meta|base)\b[^>]*\/?>/gi,
    "",
  )

  // Convert block elements (div, p) to <br> before stripping, so line breaks
  // are preserved. WebKit's contenteditable uses <div> for Enter key.
  html = html.replace(/<\/?(div|p)\b[^>]*>/gi, (match) => {
    // Opening div/p → insert <br> before content (except at the very start)
    if (!match.startsWith("</")) return "<br>"
    return ""
  })
  // Clean up duplicate <br> at the start
  html = html.replace(/^(<br>\s*)+/, "")

  // Second pass: process all remaining tags
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g, (match, tagName: string, attrs: string | undefined) => {
    const tag = tagName.toLowerCase()
    const isClosing = match.startsWith("</")

    if (!ALLOWED_TAGS.has(tag)) {
      return "" // Strip disallowed tag, keep surrounding text
    }

    if (isClosing) {
      return tag === "br" ? "" : `</${tag}>`
    }

    // Self-closing br
    if (tag === "br") {
      return "<br>"
    }

    // For span, filter style attribute; strip everything else
    if (tag === "span" && attrs) {
      const sanitizedStyle = sanitizeStyleAttribute(attrs)
      if (sanitizedStyle) {
        return `<span style="${sanitizedStyle}">`
      }
      return "<span>"
    }

    // b, i, u — no attributes allowed
    return `<${tag}>`
  })

  return html
}

/**
 * Extract and filter the `style` attribute from a tag's attribute string.
 * Only keeps properties in ALLOWED_STYLE_PROPS.
 */
function sanitizeStyleAttribute(attrs: string): string {
  const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i)
    ?? attrs.match(/style\s*=\s*'([^']*)'/i)
  if (!styleMatch) return ""

  const rawStyle = styleMatch[1]
  const declarations = rawStyle.split(";").map((d) => d.trim()).filter(Boolean)
  const allowed: string[] = []

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":")
    if (colonIdx === -1) continue
    const prop = decl.slice(0, colonIdx).trim().toLowerCase()
    const value = decl.slice(colonIdx + 1).trim()

    if (ALLOWED_STYLE_PROPS.has(prop) && value) {
      // Extra safety: strip anything that looks like url(), expression(), or javascript:
      if (/url\s*\(|expression\s*\(|javascript\s*:/i.test(value)) {
        continue
      }
      allowed.push(`${prop}: ${value}`)
    }
  }

  return allowed.join("; ")
}

/**
 * Composable for managing text annotation editing state.
 */
export function useTextEditing() {
  function startEditing(annotationId: string, currentHtml: string): void {
    editingAnnotationId.value = annotationId
    editingSnapshot.value = currentHtml
  }

  function commitEdit(): { annotationId: string; previousHtml: string } | null {
    if (!editingAnnotationId.value) return null
    const result = {
      annotationId: editingAnnotationId.value,
      previousHtml: editingSnapshot.value,
    }
    editingAnnotationId.value = null
    editingSnapshot.value = ""
    return result
  }

  function cancelEdit(): void {
    editingAnnotationId.value = null
    editingSnapshot.value = ""
  }

  return {
    editingAnnotationId,
    editingSnapshot,
    startEditing,
    commitEdit,
    cancelEdit,
  }
}
