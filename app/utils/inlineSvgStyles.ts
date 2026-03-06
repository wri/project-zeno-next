/**
 * Walks every element in a cloned SVG and inlines computed styles for a
 * whitelist of properties. This makes the serialized SVG self-contained —
 * no CSS variables, no external stylesheets, no Chakra token references.
 *
 * **Always pass a cloned SVG** so the on-screen chart is not visually disrupted.
 *
 * @param svg - A cloned SVGSVGElement to mutate in place.
 * @returns The same SVG element (for chaining).
 */

const INLINE_PROPERTIES: string[] = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "color",
  "visibility",
  "display",
];

export default function inlineSvgStyles(svg: SVGSVGElement): SVGSVGElement {
  const elements = Array.from(svg.querySelectorAll("*"));

  for (const el of elements) {
    if (!(el instanceof SVGElement || el instanceof HTMLElement)) continue;

    const computed = getComputedStyle(el);

    for (const prop of INLINE_PROPERTIES) {
      const value = computed.getPropertyValue(prop);
      if (!value) continue;

      // Leave gradient/pattern references alone — they use internal SVG ids
      if (
        (prop === "fill" || prop === "stroke") &&
        value.startsWith("url(")
      ) {
        continue;
      }

      (el as SVGElement | HTMLElement).style.setProperty(prop, value);
    }

    // Strip class attributes to avoid stale references from Chakra/Recharts
    el.removeAttribute("class");
  }

  // Also strip the class on the root <svg> itself
  svg.removeAttribute("class");

  return svg;
}
