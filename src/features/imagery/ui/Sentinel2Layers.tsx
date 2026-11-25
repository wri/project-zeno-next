/**
 * Client-rendered Sentinel-2 imagery: deck.gl reads each scene's COG with
 * HTTP range requests and draws it on the GPU, as developmentseed/stac-map
 * does. There is no tiler and no mosaic on S3.
 *
 * Loaded lazily (see the barrel), so deck.gl, the GeoTIFF decoders and their
 * WASM stay out of the main bundle and out of the SSR prerender.
 */
import { useEffect, useMemo, useState } from "react";
import { useControl, useMap } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer } from "@deck.gl/core";
import type { Device } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
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

/**
 * One luma.gl device per map, attached to MapLibre's WebGL context once.
 *
 * Every interleaved Deck otherwise attaches its own device to that context.
 * luma.gl's attach is async (it awaits an import before it checks the context
 * for a device), so two Decks created close together, as when React's
 * StrictMode mounts the overlay twice or the last capture is removed and a new
 * one added, both find none and the second throws "WebGL context already
 * attached to device". A shared promise attaches once; Deck.finalize does not
 * destroy a device it was given, so the device outlives each overlay.
 */
const devices = new WeakMap<MaplibreMap, Promise<Device>>();

function mapDevice(map: MaplibreMap): Promise<Device> {
  let device = devices.get(map);
  if (!device) {
    // The same context MapboxOverlay draws into in interleaved mode.
    const gl: WebGL2RenderingContext = map.painter.context.gl;
    device = webgl2Adapter
      .attach(gl, {
        // The settings Deck uses when it attaches a device itself; without
        // them interleaved mode rebuilds its pipelines on every frame.
        _cacheShaders: true,
        _cachePipelines: true,
      })
      .catch((error: unknown) => {
        // Forget the failure so the next mount tries again.
        devices.delete(map);
        throw error;
      });
    devices.set(map, device);
  }
  return device;
}

function DeckOverlay({ layers, device }: { layers: Layer[]; device: Device }) {
  const overlay = useControl<MapboxOverlay>(({ map }) => {
    shimTransform(map.getMap());
    // Interleaved: deck.gl draws inside MapLibre's layer stack, so `beforeId`
    // keeps the imagery below dataset rasters and AOI outlines.
    return new MapboxOverlay({ interleaved: true, device, layers: [] });
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
  const { current: mapRef } = useMap();
  const [device, setDevice] = useState<Device | null>(null);
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    let cancelled = false;
    mapDevice(map)
      .then((d) => {
        if (!cancelled) setDevice(d);
      })
      .catch((error: unknown) => {
        console.warn("Satellite imagery: WebGL device unavailable", error);
      });
    return () => {
      cancelled = true;
    };
  }, [mapRef]);

  const layers = useMemo(
    // deck.gl draws later layers on top: oldest capture first.
    () => [...captures].reverse().flatMap((c) => captureLayers(c, beforeId)),
    [captures, beforeId]
  );
  return device ? <DeckOverlay layers={layers} device={device} /> : null;
}
