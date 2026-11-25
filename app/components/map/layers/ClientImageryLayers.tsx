import { Suspense, useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import {
  Sentinel2Layers,
  type Sentinel2LayerCapture,
} from "@/src/features/imagery";

/**
 * An empty MapLibre layer that marks where client-rendered imagery goes.
 * Mounted before the raster-top sentinel, so it sits under every raster in
 * DynamicTileLayers (those anchor below the raster-top sentinel); deck.gl
 * draws the imagery just below it. A fixed anchor, unlike a dataset layer
 * id, never disappears while deck.gl references it.
 */
export const IMAGERY_SENTINEL_ID = "client-imagery-sentinel";

export function ImageryAnchorLayer() {
  return (
    <Source
      id="client-imagery-sentinel-source"
      type="geojson"
      data={{ type: "FeatureCollection", features: [] }}
    >
      <Layer id={IMAGERY_SENTINEL_ID} type="line" paint={{}} />
    </Source>
  );
}

/**
 * The client-rendered Sentinel-2 captures (layers with `sentinel2` state).
 * The deck.gl chunk loads only once the first such capture exists.
 */
export default function ClientImageryLayers() {
  const layers = useMapStore((s) => s.layers);
  const captures = useMemo<Sentinel2LayerCapture[]>(
    () =>
      layers.flatMap((l) =>
        l.sentinel2
          ? [
              {
                id: l.id,
                scenes: l.sentinel2.scenes,
                visible: l.visible,
                opacity: l.opacity ?? 1,
              },
            ]
          : []
      ),
    [layers]
  );
  if (captures.length === 0) return null;
  return (
    <Suspense fallback={null}>
      <Sentinel2Layers captures={captures} beforeId={IMAGERY_SENTINEL_ID} />
    </Suspense>
  );
}
