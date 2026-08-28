/**
 * Palette and metrics for the hierarchical flux chart.
 *
 * The colours were sampled from the design's own PNG export (the Figma MCP was
 * rate-limited), reading the legend swatches and bar fills directly rather than
 * eyeballing them.
 */

/** Source / gross emissions — positive, right of zero. */
export const EMISSIONS_COLOR = "#bf812d";
/** Sink / gross removals — negative, left of zero. */
export const REMOVALS_COLOR = "#01665e";
/** The net marker overlaid on a gross row. */
export const NET_TICK_COLOR = "#1a1812";
export const ZERO_LINE_COLOR = "#9aa0ab";
/** Panel behind the legend. */
export const LEGEND_BG = "#f6f6f6";

/**
 * One row per tree node. Uniform because recharts' category bands are uniform —
 * the HTML tree/value columns are laid out at the same pitch so the two line up
 * without measuring anything.
 */
export const ROW_HEIGHT = 36;
/** Reserved for the top axis; the flanking columns pad by the same amount. */
export const AXIS_HEIGHT = 28;
export const BAR_SIZE = 14;
/**
 * Horizontal breathing room inside the plot, so the outermost axis tick label
 * isn't clipped by the column edge (a leading minus sign is the first casualty).
 * The `n/a` overlay has to account for it to stay on the zero line.
 */
export const PLOT_MARGIN_X = 14;
