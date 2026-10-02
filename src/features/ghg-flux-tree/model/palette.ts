/**
 * Palette for the hierarchical flux chart, shared by its bars, legend,
 * headline and tooltip model.
 *
 * The colours were sampled from the design's own PNG export (the Figma MCP was
 * rate-limited), reading the legend swatches and bar fills directly rather than
 * eyeballing them.
 */

/** Source / gross emissions — positive, right of zero. */
export const EMISSIONS_COLOR = "#bf812d";
/** Sink / gross removals — negative, left of zero. */
export const REMOVALS_COLOR = "#01665e";

/** Sign tint for a net figure; zero and missing values read as a source. */
export function netFluxColor(net: number | null | undefined): string {
  return (net ?? 0) < 0 ? REMOVALS_COLOR : EMISSIONS_COLOR;
}
/** The net marker overlaid on a gross row. */
export const NET_TICK_COLOR = "#1a1812";
export const ZERO_LINE_COLOR = "#9aa0ab";
/** Panel behind the legend. */
export const LEGEND_BG = "#f6f6f6";
