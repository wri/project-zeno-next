import useMapStore from "@/app/store/mapStore";
import { isAreaLayer, type Layer } from "@/app/store/layerManagerSlice";
import { showAoisOnMap } from "@/app/store/chat-tools/pickAoi";

import type { ZapCurrent, ZapMapView } from "../model/zap-plan";

const isDatasetLayer = (l: Layer) => typeof l.datasetId === "number";

/** The layers that zap replaces: the dataset layers and the area selections. */
const isZapLayer = (l: Layer) =>
  isDatasetLayer(l) || (isAreaLayer(l) && !!l.aoiSelection);

/** An area layer that a restore must get again with its geometry. */
const isGeometryArea = (l: Layer) =>
  l.type === "geojson" && !!l.aoiSelection && !isDatasetLayer(l);

const isoDate = (date: string | undefined) => date?.slice(0, 10) ?? null;

/**
 * What the map shows now, as the planner reads it: the dataset with its
 * dates, forest type and canopy cover, and the last single area.
 */
export function readMapCurrent(): ZapCurrent {
  const { layers } = useMapStore.getState();
  const dataset = layers.find((l) => isDatasetLayer(l) && !l.parentLayerId);
  const context = dataset
    ? layers.find((l) => l.parentLayerId === dataset.id)
    : undefined;
  const canopy = dataset?.parameters?.canopy_cover;
  const areaLayer = [...layers]
    .reverse()
    .find(
      (l) => l.visible && isAreaLayer(l) && l.aoiSelection?.aois.length === 1
    );
  const aoi = areaLayer?.aoiSelection?.aois[0];
  return {
    dataset_id: dataset?.datasetId ?? null,
    area: aoi
      ? {
          name: aoi.name,
          source: aoi.source,
          src_id: aoi.src_id,
          subtype: aoi.subtype,
          bbox: aoi.bbox ?? null,
        }
      : null,
    start_date: isoDate(dataset?.startDate),
    end_date: isoDate(dataset?.endDate),
    context_layer: context?.name ?? null,
    canopy_cover: typeof canopy === "number" ? canopy : null,
  };
}

/** A copy of the map layers that zap changes, to put them back later. */
export function readMapView(): ZapMapView {
  const zapLayers = useMapStore.getState().layers.filter(isZapLayer);
  return {
    layers: zapLayers
      .filter((l) => !isGeometryArea(l))
      .map((l) => structuredClone(l)),
    areas: zapLayers.flatMap((l) =>
      isGeometryArea(l) && l.aoiSelection
        ? [
            {
              name: l.aoiSelection.name,
              // The geometry is large; the restore gets it again.
              aois: l.aoiSelection.aois.map((aoi) => ({
                ...aoi,
                geometry: undefined,
              })),
            },
          ]
        : []
    ),
  };
}

/**
 * Puts the map back in a stored view: replaces the dataset layers and the
 * area selections, and goes to the areas. The charts do not change.
 */
export async function showMapView(view: ZapMapView): Promise<void> {
  const { layers, removeLayer, addLayer } = useMapStore.getState();
  layers.filter(isZapLayer).forEach((l) => removeLayer(l.id));
  // The trail stores whole `Layer` objects; the model types them loosely.
  (view.layers as Layer[]).forEach((l) => addLayer(structuredClone(l)));
  await Promise.all(
    view.areas.map((area) => showAoisOnMap(area.aois, area.name))
  );
}
