import type { AreaSelection } from "./area-selection";
import type { Dataset } from "./dataset";

/**
 * A user's intent to run an analysis: area + dataset + date window.
 *
 * Distinct from `AreaSelection` (the ephemeral map-selection value from ADR 0007).
 * `AreaSelection` answers "what area did the user click?"; `AnalysisSelection`
 * answers "what should be analysed, with which dataset and over which period?"
 */
export interface AnalysisSelection {
  area: AreaSelection;
  dataset: Dataset;
  /** ISO date string "yyyy-MM-dd" */
  startDate: string;
  /** ISO date string "yyyy-MM-dd" */
  endDate: string;
  /** Context layer of the dataset, e.g. "primary_forest". */
  contextLayer?: string;
  /** Minimum canopy cover in percent; the backend default is 30. */
  canopyCover?: number;
}
