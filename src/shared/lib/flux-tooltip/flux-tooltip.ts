/**
 * The hover-tooltip model the curated LGMS flux charts share: swatched lines
 * that close on a bold net total. Each chart builds its own model; the
 * `FluxTooltip` panel in `src/shared/ui` renders it.
 */

/** One rendered line of the hover tooltip: swatch, label, value. */
export interface FluxTooltipRow {
  /** Stable React key. */
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * The tooltip's closing line: the net figure the rows above it sum to,
 * printed bold so it reads as a total and not as one more series.
 */
export interface FluxTooltipTotal {
  label: string;
  value: number;
  /** Swatch colour — a net-only view tints its total by sign like its bar. */
  color?: string;
}

export interface FluxTooltipModel {
  rows: FluxTooltipRow[];
  /** Null when the hovered point has no net figure to close on. */
  total: FluxTooltipTotal | null;
}

/** What the total is called when the chart has a gross breakdown above it. */
export const NET_FLUX_TOTAL_LABEL = "Net flux";
