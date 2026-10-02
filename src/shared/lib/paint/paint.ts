/**
 * True for an SVG paint server reference (`url(#pattern-id)`), which only an
 * SVG `fill` can resolve — a CSS `background` can't.
 */
export function isPaintReference(color: string): boolean {
  return color.startsWith("url(");
}
