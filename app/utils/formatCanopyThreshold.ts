/**
 * Shared CANOPY threshold wording. Chips use the compact form
 * (`formatCanopyThreshold`), in the insight workspace (AnalysisParamsChips)
 * and the map legend (LayerEntry), so the two render identically. The
 * Analyses pane's "What was analyzed" panel uses the long form
 * (`describeCanopyThreshold`).
 */
export function formatCanopyThreshold(value: number | string): string {
  return `> ${value}%`;
}

export function describeCanopyThreshold(value: number | string): string {
  return `More than ${value}%`;
}
