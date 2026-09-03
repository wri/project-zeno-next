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
/**
 * Ceiling for the tree label column, which otherwise grows with its longest
 * label and starves the plot. 215px is what the deepest label the design shows
 * in full ("Trees remaining trees") measures at; the longer
 * "Non-trees remaining non-trees" needs 269px and so clips, exactly as the
 * frame draws it.
 *
 * It is a *maximum*, not a fixed width: the column flexes below it when the
 * card is too narrow to give the plot its floor as well. That is the design's
 * own "(degradation)" state — labels clip progressively rather than the axis
 * collapsing.
 */
export const TREE_COLUMN_MAX_WIDTH = 215;

/** Axis tick labels sit a step below the row labels, as the design draws them. */
export const AXIS_FONT_SIZE = 9;

/**
 * Floor for the plot column, derived rather than guessed. The outermost ticks
 * sit ~79% of the inner width apart, so five labels give four gaps of
 * `0.79 * (W - 2 * PLOT_MARGIN_X) / 4`; the widest neighbours ("1000", "1500")
 * measure ~19px at `AXIS_FONT_SIZE`, so ~23px of spacing each puts W at ~145.
 *
 * The tree column yields to this, so a card too narrow to satisfy both clips
 * labels rather than collapsing the axis.
 */
export const PLOT_MIN_WIDTH = 150;

/**
 * Width this chart needs from its host card, so that the only row label the
 * design clips is the longest one:
 *
 *   32 (card padding) + 215 (tree) + 150 (plot) + ~96 (value column) ≈ 493
 *
 * The workspace's other insights sit in a 420px column (`Map.tsx`), which is
 * ~70px short of that — enough to eat most of the label column. `InsightWorkspace`
 * widens the card to this only while the flux tree is the visible insight.
 */
export const FLUX_TREE_CARD_WIDTH = 520;
export const BAR_SIZE = 14;
/**
 * Horizontal breathing room inside the plot, so the outermost axis tick label
 * isn't clipped by the column edge (a leading minus sign is the first casualty).
 * The `n/a` overlay has to account for it to stay on the zero line.
 */
export const PLOT_MARGIN_X = 14;
