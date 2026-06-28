import { format } from "date-fns";

import { DATASET_BY_ID } from "@/app/constants/datasets";
import {
  isAreaLayer,
  type GeoJsonEntry,
  type Layer,
} from "@/app/store/layerManagerSlice";
import type { MessageContext, UiContext } from "@/app/types/chat";

// Per-slot identity of the context last sent to the backend on a thread. Used
// to send each slot only when it changes (the `/api/chat` `ui_context` is
// non-idempotent, so the client deduplicates). `null` means "nothing for this
// slot has been sent yet".
export interface ContextKeys {
  aoi: string | null; // aoi_name of the first area layer
  dataset: number | null; // datasetId of the active dataset layer
  daterange: string | null; // "start|end"
}

export const emptyContextKeys = (): ContextKeys => ({
  aoi: null,
  dataset: null,
  daterange: null,
});

export interface DerivedContext {
  // Full payload for every slot currently present (before deduplication).
  uiContext: UiContext;
  // Identity keys for diffing against the last sent context.
  keys: ContextKeys;
  // Full active context for the user-message chip.
  snapshot: MessageContext;
}

const visibleAreaLayers = (layers: Layer[]): Layer[] =>
  layers.filter((l) => l.visible && isAreaLayer(l));

// The active dataset is the main dataset layer (carries datasetId, not a
// context sub-layer). Matches resolveDatasetMeta in exportToAI.ts.
const datasetLayer = (layers: Layer[]): Layer | undefined =>
  layers.find((l) => typeof l.datasetId === "number" && !l.parentLayerId);

const areaName = (l: Layer): string =>
  l.aoiSelection?.name ?? l.selectionName ?? l.name;

// Build `ui_context.aoi_selected` from the first visible area layer.
//
// AI- and global-picked layers carry a full `aoiSelection`, so the AOI is read
// directly from it. Manually-selected areas (admin-boundary clicks, custom
// draw/upload) carry only `featureRefs`; their AOI metadata is reconstructed
// from the geojson registry. The reconstruction reproduces the old
// contextStore `aoiData` exactly: `source` is lower-cased and `gadm_id`
// mirrors `src_id` for GADM clicks, matching the legacy `idField` behaviour.
function buildAoiSelected(
  layers: Layer[],
  registry: GeoJsonEntry[]
): UiContext["aoi_selected"] | undefined {
  const layer = layers.find((l) => l.visible && isAreaLayer(l));
  if (!layer) return undefined;

  const fromSelection = layer.aoiSelection?.aois?.[0];
  if (fromSelection) {
    return {
      aoi: {
        name: fromSelection.name,
        gadm_id: undefined,
        src_id: fromSelection.src_id,
        subtype: fromSelection.subtype,
        source: fromSelection.source,
      },
      aoi_name: layer.aoiSelection?.name ?? fromSelection.name,
      subtype: fromSelection.subtype,
    };
  }

  // Manual area: reconstruct from the registry entry of the first feature ref.
  const ref = layer.featureRefs?.[0];
  if (!ref) return undefined;
  const entry = registry.find(
    (e) => e.ref.name === ref.name && e.ref.source === ref.source
  );
  if (!entry) return undefined;

  const isGadm = entry.ref.source === "GADM";
  return {
    aoi: {
      name: layer.name,
      gadm_id: isGadm ? entry.srcId : undefined,
      src_id: entry.srcId,
      subtype: entry.subtype,
      source: entry.ref.source.toLowerCase(),
    },
    aoi_name: layer.name,
    subtype: entry.subtype,
  };
}

// Derive the full context (payload + diff keys + chip snapshot) from the
// current map layers, geojson registry and selected date range.
export function deriveContext(
  layers: Layer[],
  registry: GeoJsonEntry[],
  dateRange: { start: Date; end: Date } | null
): DerivedContext {
  const uiContext: UiContext = {};
  const keys = emptyContextKeys();

  const aoiSelected = buildAoiSelected(layers, registry);
  if (aoiSelected) {
    uiContext.aoi_selected = aoiSelected;
    keys.aoi = aoiSelected.aoi_name;
  }

  const ds = datasetLayer(layers);
  if (typeof ds?.datasetId === "number") {
    const info = DATASET_BY_ID[ds.datasetId];
    if (info) {
      uiContext.dataset_selected = { dataset: info };
      keys.dataset = ds.datasetId;
    }
  }

  if (dateRange) {
    const start_date = format(dateRange.start, "yyyy-MM-dd");
    const end_date = format(dateRange.end, "yyyy-MM-dd");
    uiContext.daterange_selected = { start_date, end_date };
    keys.daterange = `${start_date}|${end_date}`;
  }

  const snapshot: MessageContext = {};
  const areas = visibleAreaLayers(layers).map(areaName);
  if (areas.length > 0) snapshot.areas = areas;
  const datasets = layers
    .filter((l) => typeof l.datasetId === "number" && !l.parentLayerId)
    .map((l) => l.name);
  if (datasets.length > 0) snapshot.datasets = datasets;
  if (uiContext.daterange_selected) {
    snapshot.daterange = uiContext.daterange_selected;
  }

  return { uiContext, keys, snapshot };
}

// Reduce a full context to just the slots that differ from `last`, so we only
// re-announce a slot to the backend when it actually changes.
export function diffUiContext(
  full: UiContext,
  keys: ContextKeys,
  last: ContextKeys
) {
  const ui: UiContext = {};
  if (keys.aoi !== last.aoi && full.aoi_selected) {
    ui.aoi_selected = full.aoi_selected;
  }
  if (keys.dataset !== last.dataset && full.dataset_selected) {
    ui.dataset_selected = full.dataset_selected;
  }
  if (keys.daterange !== last.daterange && full.daterange_selected) {
    ui.daterange_selected = full.daterange_selected;
  }
  return ui;
}
