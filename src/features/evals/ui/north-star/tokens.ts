/**
 * Visual tokens for the North Star view, on the app's theme: the primary
 * blue ramp carries the sequential performance scale (the wireframe used
 * green); orange marks dips; hatching marks "no evals yet".
 */

export const PERF_BG = {
  1: "primary.100",
  2: "primary.200",
  3: "primary.300",
  4: "primary.500",
  5: "primary.700",
} as const;

export const PERF_FG = {
  1: "primary.900",
  2: "primary.900",
  3: "primary.900",
  4: "white",
  5: "white",
} as const;

/** Diagonal hatching for cells with no evals: we don't know. */
export const HATCH =
  "repeating-linear-gradient(45deg, transparent 0 5px, var(--chakra-colors-border-emphasized) 5px 7px)";

/** Opacity for thin-coverage cells (wireframe variant A). */
export const THIN_OPACITY = 0.5;

/** "0.774, 0.843" -> "77.4–84.3%". */
export function fmtRange(low: number, high: number, digits = 1): string {
  return `${(low * 100).toFixed(digits)}–${(high * 100).toFixed(digits)}%`;
}
