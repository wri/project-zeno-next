import { z } from "zod";

/**
 * `analysis_inputs` exactly as the backend sends it on an insight (REST, the
 * dashboards expansion and the `generate_insights` stream update): one entry
 * per data pull the insight was computed from, in pull order. `null` means
 * the inputs were not recorded; an older backend omits the key. Inner fields
 * it has no value for are explicit nulls.
 */
export const AnalysisInputsWireSchema = z
  .array(
    z.object({
      areas: z.array(
        z.object({
          name: z.string(),
          source: z.string().nullable(),
          src_id: z.string().nullable(),
        })
      ),
      dataset_id: z.number().nullable(),
      dataset_name: z.string(),
      start_date: z.iso.date(),
      end_date: z.iso.date(),
      canopy_cover: z.number().nullable(),
    })
  )
  .nullable();

export type AnalysisInputsWire = z.infer<typeof AnalysisInputsWireSchema>;

/** An area an analysis ran on. */
export interface AnalyzedArea {
  name: string;
  /**
   * Set when the backend recorded the area's identity. A chat-path GADM
   * `srcId` lacks the `_N` version suffix (`BRA.22`, not `BRA.22_1`), so it
   * identifies the area but must not be used to fetch its geometry.
   */
  ref?: { source: string; srcId: string };
}

export interface AnalyzedDataset {
  name: string;
  id?: number;
}

/** Inclusive calendar years the statistics cover. */
export interface AnalyzedYears {
  start: number;
  end: number;
}

/**
 * What an analysis was computed from, settled once at the boundary by
 * `toAnalysisInputs`: each list holds distinct values in pull order.
 */
export type AnalysisInputs =
  | { recorded: false }
  | {
      recorded: true;
      areas: AnalyzedArea[];
      datasets: AnalyzedDataset[];
      canopyCover: number[];
      years: AnalyzedYears[];
    };

export type RecordedAnalysisInputs = Extract<
  AnalysisInputs,
  { recorded: true }
>;
