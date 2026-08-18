import type { AnalysisService } from "../model/analysis-service";
import { LROAnalysisService } from "../model/lro-analysis-service";
import { RestAnalysisGateway } from "../api/rest-analysis-gateway";
import { DatasetOverrideGateway } from "../api/dataset-override-gateway";
import { SystemClock } from "../lib/system-clock";
import {
  LGMS_DATASET_ID,
  NET_FLUX_DUMMY_RESULT,
} from "@/src/features/net-flux";

/**
 * Composition root for the analysis use-case: the real LRO service wired to its
 * real driven adapters.
 *
 * `DatasetOverrideGateway` is a temporary WIP-backend shim: project-zeno's
 * `/api/analyze` accepts the LGMS dataset end-to-end but has no chart
 * generator for it yet, so requests for it resolve to canned data instead of
 * hitting the network — everything else passes straight through to the real
 * gateway. Delete the override once the backend ships a real generator.
 *
 * Exported from the slice barrel so other slices can run a non-generative
 * analysis without going through `useAnalysis` — the dashboards slice seeds a
 * new dashboard with one, and needs the resolved `AnalysisResult` (specifically
 * its persisted insight id) rather than the workspace side effect the hook
 * performs.
 */
export const analysisService: AnalysisService = new LROAnalysisService(
  new DatasetOverrideGateway(new RestAnalysisGateway(), {
    [LGMS_DATASET_ID]: NET_FLUX_DUMMY_RESULT,
  }),
  new SystemClock()
);
