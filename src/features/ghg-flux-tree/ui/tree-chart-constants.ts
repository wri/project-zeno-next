/**
 * Layout metrics for the hierarchical flux chart. Its palette lives in
 * `../model/palette.ts`, where the tooltip model can reach it too.
 */

/**
 * One row per tree node. Uniform because recharts' category bands are uniform —
 * the HTML tree/value columns are laid out at the same pitch so the two line up
 * without measuring anything.
 */
export const ROW_HEIGHT = 30;
/** Reserved for the top axis; the flanking columns pad by the same amount. */
export const AXIS_HEIGHT = 28;
/**
 * Ceiling for the tree label column, which otherwise grows with its longest
 * label and starves the plot. 215px is what the longest label the design shows
 * in full ("Trees remaining trees") measures at, plus 17px for the per-row info
 * icon that now trails every label (`NODE_INFO_ICON_SIZE` + its 4px gap) —
 * without that allowance the icon would be taken out of the label's share and
 * clip the very label the ceiling was sized for. The frame's own longest label,
 * "Non-trees remaining non-trees", needed 269px and clipped; the product has
 * since renamed that class "Non-tree vegetation" (see `lgms-labels`), which
 * fits within the ceiling.
 *
 * It is a *maximum*, not a fixed width: the column flexes below it when the
 * card is too narrow to give the plot its floor as well. That is the design's
 * own "(degradation)" state — labels clip progressively rather than the axis
 * collapsing.
 */
export const TREE_COLUMN_MAX_WIDTH = 232;

/** Axis tick labels sit a step below the row labels, as the design draws them. */
export const AXIS_FONT_SIZE = 9;

/**
 * The per-row info icon, a step down from the 16px the shared `InfoTooltip`
 * uses on the card heading and the pills. Those sit beside 15px headings; these
 * sit beside 13px row labels in a 36px band, thirteen of them at once, so at
 * the default size they read as a column of controls rather than a quiet
 * annotation on each class. `TREE_COLUMN_MAX_WIDTH` reserves this plus its gap.
 */
export const NODE_INFO_ICON_SIZE = 13;

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
 *   32 (card padding) + 232 (tree) + 150 (plot) + ~96 (value column) ≈ 510
 *
 * The workspace's other insights sit in a 420px column (`Map.tsx`), which is
 * ~90px short of that — enough to eat most of the label column. `InsightWorkspace`
 * widens the card to this only while the flux tree is the visible insight.
 */
export const FLUX_TREE_CARD_WIDTH = 540;
export const BAR_SIZE = 14;
/**
 * Horizontal breathing room inside the plot, so the outermost axis tick label
 * isn't clipped by the column edge (a leading minus sign is the first casualty).
 * The `n/a` overlay has to account for it to stay on the zero line.
 */
export const PLOT_MARGIN_X = 14;
