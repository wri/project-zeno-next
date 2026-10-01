import useMapStore from "@/app/store/mapStore";
import { isAreaLayer } from "@/app/store/layerManagerSlice";
import { addDatasetToMap } from "@/app/store/chat-tools/pickDataset";
import { showAoisOnMap } from "@/app/store/chat-tools/pickAoi";
import { isViewOnlyDataset } from "@/app/constants/datasets";
import { isAnalysableForSource } from "@/src/features/analysis";

import { fetchZapPlan } from "../api/zap-client";
import { toAoi, type ZapCurrent } from "../model/zap-plan";
import useZapStore from "../model/zap-store";

/** How long the plan shows before its steps run, in milliseconds. */
const PLAN_PAUSE_MS = 500;
/** The pause between steps, so each step shows as done in turn. */
const STEP_PAUSE_MS = 250;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** What the map shows now: the dataset layer and the last single area. */
function currentMap(): ZapCurrent {
  const { layers } = useMapStore.getState();
  const dataset = layers.find(
    (l) => typeof l.datasetId === "number" && !l.parentLayerId
  );
  const areaLayer = [...layers]
    .reverse()
    .find(
      (l) => l.visible && isAreaLayer(l) && l.aoiSelection?.aois.length === 1
    );
  const aoi = areaLayer?.aoiSelection?.aois[0];
  return {
    dataset_id: dataset?.datasetId,
    area: aoi
      ? {
          name: aoi.name,
          source: aoi.source,
          src_id: aoi.src_id,
          subtype: aoi.subtype,
        }
      : undefined,
  };
}

/**
 * Plans one prompt with `POST /api/zap`, then runs the plan's steps in
 * order: show the dataset, go to the area, chart the dataset for the area.
 * The chart step is handed to `ZapRunner`, which marks it done.
 */
export async function runZap(prompt: string): Promise<void> {
  const store = useZapStore.getState();
  if (store.status === "planning" || store.status === "running") return;
  store.start(prompt);

  try {
    const plan = await fetchZapPlan(prompt, currentMap());
    store.setPlan(plan);
    if (plan.steps.length === 0) {
      store.finish();
      return;
    }
    await pause(PLAN_PAUSE_MS);

    for (const [index, step] of plan.steps.entries()) {
      store.setStep(index, "running");
      if (step.kind === "dataset") {
        addDatasetToMap(step.args);
        await pause(STEP_PAUSE_MS);
        store.setStep(index, "done");
      } else if (step.kind === "area") {
        // Zap shows one area at a time.
        const { layers, removeLayer } = useMapStore.getState();
        layers
          .filter((l) => isAreaLayer(l) && l.aoiSelection)
          .forEach((l) => removeLayer(l.id));
        const { successfulAois } = await showAoisOnMap(
          [toAoi(step.args)],
          step.args.name
        );
        store.setStep(index, successfulAois.length > 0 ? "done" : "failed");
      } else {
        const { dataset_id, area } = step.args;
        if (
          isViewOnlyDataset(dataset_id) ||
          !isAnalysableForSource(dataset_id, area.source)
        ) {
          store.setStep(index, "skipped");
          continue;
        }
        store.requestAnalysis(index);
        return;
      }
    }
    store.finish();
  } catch (error) {
    store.fail(error instanceof Error ? error.message : String(error));
  }
}
