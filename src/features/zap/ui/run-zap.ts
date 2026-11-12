import useMapStore from "@/app/store/mapStore";
import { isAreaLayer } from "@/app/store/layerManagerSlice";
import { addDatasetToMap } from "@/app/store/chat-tools/pickDataset";
import { showAoisOnMap } from "@/app/store/chat-tools/pickAoi";
import { isViewOnlyDataset } from "@/app/constants/datasets";
import { isAnalysableForSource } from "@/src/features/analysis";

import { fetchZapPlan } from "../api/zap-client";
import { stateAfter, toAoi } from "../model/zap-plan";
import useZapStore, { type ZapStatus } from "../model/zap-store";
import { readMapCurrent, readMapView, showMapView } from "./map-view";

/** How long the plan shows before its steps run, in milliseconds. */
const PLAN_PAUSE_MS = 500;
/** The pause between steps, so each step shows as done in turn. */
const STEP_PAUSE_MS = 250;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

let rowCount = 0;
const newRowId = () => `${Date.now().toString(36)}-${++rowCount}`;

export const isZapBusy = (status: ZapStatus) =>
  status === "planning" || status === "running";

/**
 * Plans one prompt with `POST /api/zap` from the map state now, adds it as a
 * row of the trail, then runs the steps in order: show the dataset, go to
 * the area, chart the dataset for the area. The chart step is handed to
 * `ZapRunner`, which marks it done.
 */
export async function runZap(prompt: string): Promise<void> {
  const store = useZapStore.getState();
  if (isZapBusy(store.status)) return;
  const before = readMapView();
  const current = readMapCurrent();
  store.start(prompt);

  const rowId = newRowId();
  let added = false;
  try {
    const plan = await fetchZapPlan(prompt, current);
    store.addRow(
      {
        id: rowId,
        prompt,
        plan,
        state: stateAfter(current, plan),
        view: before,
      },
      before
    );
    added = true;
    if (plan.steps.length === 0) {
      store.finish();
      return;
    }
    await pause(PLAN_PAUSE_MS);

    for (const [index, step] of plan.steps.entries()) {
      store.setStep(rowId, index, "running");
      if (step.kind === "dataset") {
        addDatasetToMap(step.args);
        await pause(STEP_PAUSE_MS);
        store.setStep(rowId, index, "done");
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
        store.setStep(
          rowId,
          index,
          successfulAois.length > 0 ? "done" : "failed"
        );
      } else {
        const { dataset_id, area } = step.args;
        if (
          isViewOnlyDataset(dataset_id) ||
          !isAnalysableForSource(dataset_id, area.source)
        ) {
          store.setStep(rowId, index, "skipped");
          continue;
        }
        store.setView(rowId, readMapView());
        store.requestAnalysis(rowId, index);
        return;
      }
    }
    store.setView(rowId, readMapView());
    store.finish();
  } catch (error) {
    // A step that failed can leave a part of the plan on the map.
    if (added) store.setView(rowId, readMapView());
    store.fail(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Selects a row of the trail and puts the map in its state. -1 is the map
 * before the first row. Does nothing while a plan is in progress.
 */
export async function showZapRow(index: number): Promise<void> {
  const { status, rows, base, select } = useZapStore.getState();
  if (isZapBusy(status) || index < -1 || index >= rows.length) return;
  const view = index === -1 ? base : rows[index].view;
  select(index);
  if (view) await showMapView(view);
}

/** Goes back one row, or to the map before the first row. */
export const undoZap = () => showZapRow(useZapStore.getState().index - 1);

/** Goes forward one row. */
export const redoZap = () => showZapRow(useZapStore.getState().index + 1);
