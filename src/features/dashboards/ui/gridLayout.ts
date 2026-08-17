/**
 * Column count follows the grid's own width, not the viewport: the full-size
 * chat is a fixed overlay that narrows the content area without changing the
 * viewport, so a viewport breakpoint would keep two columns the cards can't
 * fit into (each has a real minimum — chart toolbar + axis margins — of
 * roughly 330px) and the grid would overflow the page horizontally. 700px
 * fits two minimum-width cards plus the gap.
 *
 * Shared by the grid (top-level segments) and the insight module (its
 * internal chart columns) — both resolve against the same `widgets-grid`
 * container, so the whole page switches columns together.
 */
export const TWO_COLUMN_QUERY = "@container widgets-grid (min-width: 700px)";
