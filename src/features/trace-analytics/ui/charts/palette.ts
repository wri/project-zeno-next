/**
 * Chart colors derived from the GNW (project-zeno-next) palette and validated
 * for colorblind safety (adjacent-pair CVD ΔE ≥ 12) and lightness/chroma on a
 * white chart surface. GNW's raw chart hues that failed validation (yellow,
 * orange, cyan, pink) are snapped to darker steps of the same hue family.
 */

export const OUTCOME_LABELS: Readonly<Record<string, string>> = {
  ANSWER: "Success",
  DEFER: "Defer",
  SOFT_ERROR: "Soft error",
  ERROR: "Error",
  EMPTY: "Error (Empty)",
};

/**
 * Outcome status scale: green = answered, neutral gray = deferred, amber =
 * apologetic answer, red = user-visible failure, dark maroon = nothing at all.
 * Severity maps to darkness within the warm arm; Defer is deliberately
 * recessive (it is the "nothing happened" neutral).
 */
export const OUTCOME_COLORS: Readonly<Record<string, string>> = {
  Success: "#00A651",
  "Soft error": "#D97D05",
  Defer: "#B2B7BD",
  Error: "#E23A22",
  "Error (Empty)": "#8C2332",
};

/** Stacking order for the daily outcome chart (bottom → top). */
export const OUTCOME_STACK_ORDER = [
  "Error",
  "Error (Empty)",
  "Defer",
  "Soft error",
  "Success",
] as const;

/**
 * Canonical display order for outcome labels (best → worst). Use it wherever
 * outcomes are listed — donut slices, legends, scatter series — so ordering
 * never depends on which outcome happens to be most frequent.
 */
export const OUTCOME_SEVERITY_ORDER = [
  "Success",
  "Defer",
  "Soft error",
  "Error",
  "Error (Empty)",
] as const;

/** Sort labels by OUTCOME_SEVERITY_ORDER; unknown labels keep input order at the end. */
export function outcomeOrderIndex(label: string): number {
  const index = (OUTCOME_SEVERITY_ORDER as readonly string[]).indexOf(label);
  return index === -1 ? OUTCOME_SEVERITY_ORDER.length : index;
}

/**
 * Refined-outcome display colors, keyed by the REFINED_LABELS values in
 * lib/analytics/outcomeRefine. Keep the label strings in sync with that map.
 * Same status scale as OUTCOME_COLORS: green = answered (mint/cyan steps split
 * degraded and context answers), gray = defer/UI-event, amber = soft error, red
 * = empty answer, dark maroon = no response.
 */
export const REFINED_OUTCOME_COLORS: Readonly<Record<string, string>> = {
  "Attempted answer": "#00A651",
  "Answered (internal errors)": "#00B086",
  "Answered from context": "#0092C4",
  "Defer (clarify / other)": "#B2B7BD",
  "Soft error": "#D97D05",
  "Empty answer": "#E23A22",
  "No response": "#8C2332",
  "UI event (no prompt)": "#CDD2D8",
};

/** Refined labels, best → worst (mix bars, legends). */
export const REFINED_SEVERITY_ORDER = [
  "Attempted answer",
  "Answered (internal errors)",
  "Answered from context",
  "Defer (clarify / other)",
  "Soft error",
  "Empty answer",
  "No response",
  "UI event (no prompt)",
] as const;

/** Refined stacking order for the daily area (bottom → top; best on top). */
export const REFINED_STACK_ORDER = [
  "UI event (no prompt)",
  "No response",
  "Empty answer",
  "Soft error",
  "Defer (clarify / other)",
  "Answered from context",
  "Answered (internal errors)",
  "Attempted answer",
] as const;

/**
 * Refined-outcome / flow-diagram colors, keyed by node key (see
 * lib/analytics/outcomeRefine). Validated with the outcome set: CVD worst
 * adjacent pair ΔE 13.0; low-contrast steps (amber, grays, mint) are
 * always paired with direct labels.
 */
export const FLOW_NODE_COLORS: Readonly<Record<string, string>> = {
  SOURCE: "#13171A",
  RESPONDED: "#656E7B",
  HARD_ERROR: "#E23A22",
  NO_PROMPT: "#CDD2D8",
  SOFT_ERROR: "#D97D05",
  DEFER: "#B2B7BD",
  DEFER_OTHER: "#B2B7BD",
  CONTEXT_ANSWER: "#0092C4",
  ANSWER_DEGRADED: "#00B086",
  ANSWER_CLEAN: "#00A651",
  ANSWER: "#00A651",
};

/**
 * Categorical palette in GNW hue families (blue anchor = GNW primary.400).
 * The ordering is the CVD-safety mechanism — do not reshuffle or cycle.
 * Validated: worst adjacent-pair ΔE 19.8 on white.
 */
export const CATEGORY_COLORS = [
  "#3361C0", // GNW primary blue
  "#D97D05", // orange
  "#00A651", // GNW green
  "#D6437B", // pink
  "#0092C4", // cyan
  "#E23A22", // red
  "#A93AEE", // purple
  "#C99400", // gold
  "#00B086", // GNW mint
  "#9A4880", // GNW berenjena
] as const;

/**
 * Segment pairs encode polarity, not identity: the saturated color is the
 * state we watch (new, engaged), its pale partner is the rest.
 */
export const SEGMENT_COLORS = {
  new: "#3361C0",
  returning: "#AFBFE6",
  engaged: "#00A651",
  notEngaged: "#CDD2D8",
} as const;

/** Shared chart chrome (GNW ChartWidget conventions). */
export const CHART_CHROME = {
  grid: "#E1E2E6",
  axisTick: "#656E7B",
  tickFontSize: 11,
  /** Dashed reference lines (e.g. daily prompt limit). */
  reference: "#E23A22",
  /** Moving averages and other derived context series. */
  contextSeries: "#656E7B",
  /** Ring/spacer color separating adjacent fills. */
  surface: "#FFFFFF",
} as const;

/** GNW primary-blue sequential ramp endpoints for heat encodings. */
export const SEQUENTIAL_BLUE = {
  from: "#F0F4FC",
  to: "#0041B1",
} as const;

function hexToRgb(hex: string): readonly [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const RAMP_FROM = hexToRgb(SEQUENTIAL_BLUE.from);
const RAMP_TO = hexToRgb(SEQUENTIAL_BLUE.to);

/** Interpolated GNW blue ramp at t ∈ [0, 1]: light (0) → brand blue (1). */
export function sequentialBlue(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const mix = RAMP_FROM.map((from, i) =>
    Math.round(from + (RAMP_TO[i] - from) * clamped)
  );
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
