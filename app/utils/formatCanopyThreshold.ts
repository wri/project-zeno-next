/**
 * Shared CANOPY threshold formatting for analysis-parameter chips. Used by both
 * the insight workspace (AnalysisParamsChips) and the map legend (LayerEntry) so
 * the two render identically.
 */
export function formatCanopyThreshold(value: number | string): string {
  return `> ${value}%`;
}
