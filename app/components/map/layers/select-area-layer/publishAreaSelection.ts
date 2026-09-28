import useMapStore from "@/app/store/mapStore";
import type { LayerId } from "@/app/types/map";
import {
  toAreaSelection,
  type SelectionMetadata,
} from "@/app/utils/areaHelpers";
import { useSelectionStore } from "@/src/features/analysis";

export interface PublishAreaSelectionInput {
  layerId: LayerId;
  featureProps: Record<string, unknown> | null | undefined;
  metadata: SelectionMetadata | null;
}

/**
 * Publishes a clicked boundary as the analysis selection that both nudges
 * consume: `AnalysisCtaTrigger` via `mapStore.analysisSelection`, and the
 * direct "View Analysis" nudge via the selection store.
 *
 * Every reference source qualifies (GADM, KBA, WDPA, Landmark) — the backend
 * analyses each natively by id — but only once the feature yielded a backend
 * id: an analysis can't be addressed without one, so an id-less click clears
 * the selection rather than offer a nudge that cannot run.
 */
export function publishAreaSelection({
  layerId,
  featureProps,
  metadata,
}: PublishAreaSelectionInput): void {
  const selection = metadata
    ? toAreaSelection(layerId, featureProps ?? {}, metadata)
    : null;

  if (!selection?.srcId) {
    useMapStore.getState().clearAnalysis();
    useSelectionStore.getState().clear();
    return;
  }

  useMapStore.getState().setAnalysis(selection);
  useSelectionStore.getState().select(selection);
}
