/**
 * Client-rendered Sentinel-2 imagery: deck.gl reads each scene's COG with
 * HTTP range requests and draws it on the GPU, as developmentseed/stac-map
 * does. There is no tiler and no mosaic on S3.
 *
 * Loaded lazily (see the barrel), so deck.gl, the GeoTIFF decoders and their
 * WASM stay out of the main bundle and out of the SSR prerender.
 */
import { useMemo } from "react";
import { useControl } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer } from "@deck.gl/core";
import { COGLayer, MosaicLayer } from "@developmentseed/deck.gl-geotiff";
import type { GeoTIFF } from "@developmentseed/geotiff";
import { epsgResolver } from "@developmentseed/proj";
import { loadGeoTIFF } from "../api/geotiff";
import { SCENE_LIMITS, type Scene } from "../model/scenes";

/** One capture (map layer) to draw. */
export interface Sentinel2LayerCapture {
  id: string;
  scenes: Scene[];
  visible: boolean;
  /** 0..1 */
  opacity: number;
}

export interface Sentinel2LayersProps {
  /** Top of the stack first, as in the layer manager. */
  captures: Sentinel2LayerCapture[];
  /** MapLibre layer the imagery is drawn below. */
  beforeId?: string;
}

/**
 * deck.gl 9.4 interleaved mode reads `map.transform.height` and
 * `map.transform.elevation` on every frame. maplibre-gl 6 no longer exposes
 * `transform`, so the read throws and nothing draws. Give deck.gl the two
 * values it needs. The map is flat (no pitch, no terrain, no globe), so
 * elevation is 0. Remove this when deck.gl supports maplibre-gl 6.
 */
function shimTransform(map: MaplibreMap) {
  if ("transform" in map && (map as { transform?: unknown }).transform) return;
  Object.defineProperty(map, "transform", {
    configurable: true,
    get: () => ({ height: map.getCanvas().clientHeight, elevation: 0 }),
  });
}

function DeckOverlay({ layers }: { layers: Layer[] }) {
  const overlay = useControl<MapboxOverlay>(({ map }) => {
    shimTransform(map.getMap());
    // Interleaved: deck.gl draws inside MapLibre's layer stack, so `beforeId`
    // keeps the imagery below dataset rasters and AOI outlines.
    return new MapboxOverlay({ interleaved: true, layers: [] });
  });
  overlay.setProps({ layers });
  return null;
}

function captureLayers(
  capture: Sentinel2LayerCapture,
  beforeId: string | undefined
): Layer[] {
  // MosaicLayer collects its sources through a spatial index, so the order
  // of `sources` does not decide what is on top. One MosaicLayer per rank,
  // worst rank first, puts rank 0 (the scene nearest the date) on top; the
  // others only show through its nodata gaps.
  const ranks = [...new Set(capture.scenes.map((s) => s.rank))].sort(
    (a, b) => b - a
  );
  return ranks.map(
    (rank) =>
      new MosaicLayer<Scene, GeoTIFF>({
        id: `sentinel2-${capture.id}-rank-${rank}`,
        // Read by the interleaved MapboxOverlay; not typed on LayerProps.
        ...({ beforeId } as object),
        minZoom: SCENE_LIMITS.minZoom,
        visible: capture.visible,
        opacity: capture.opacity,
        sources: capture.scenes.filter((s) => s.rank === rank),
        getSource: (scene) => loadGeoTIFF(scene.visualHref),
        renderSource: (scene, { data, signal }) =>
          data
            ? new COGLayer({
                id: `sentinel2-cog-${scene.id}`,
                geotiff: data,
                epsgResolver,
                signal,
                opacity: capture.opacity,
              })
            : null,
      })
  );
}

export default function Sentinel2Layers({
  captures,
  beforeId,
}: Sentinel2LayersProps) {
  const layers = useMemo(
    // deck.gl draws later layers on top: oldest capture first.
    () => [...captures].reverse().flatMap((c) => captureLayers(c, beforeId)),
    [captures, beforeId]
  );
  return <DeckOverlay layers={layers} />;
}
