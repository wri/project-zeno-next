import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import type { Layer as ManagedLayer } from "@/app/store/layerManagerSlice";
import type { VectorStyleSpec } from "@/app/constants/datasets";
import { layerId, RASTER_TOP_SENTINEL_ID } from "./DynamicTileLayers";

type StyledVectorLayer = ManagedLayer & {
  tileUrl: string;
  sourceLayer: string;
  vectorStyle: VectorStyleSpec;
};

/**
 * Builds a MapLibre data-driven `match` expression from a VectorStyleSpec.
 *
 * Example output for IFL year==2000:
 *   ["match", ["to-string", ["get", "year"]], "2000", "#5C8C50", "transparent"]
 *
 * Unmatched features resolve to fallbackColor ("transparent" by default),
 * so no feature filter is needed — features simply render invisibly.
 */
function buildColorExpression(spec: VectorStyleSpec): unknown[] {
  const prop: unknown[] = spec.coerceToString
    ? ["to-string", ["get", spec.property]]
    : ["get", spec.property];

  return [
    "match",
    prop,
    ...spec.colorMap.flatMap((c) => [String(c.value), c.color]),
    spec.fallbackColor ?? "transparent",
  ];
}

/**
 * Generic, descriptor-driven renderer for styled vector (MVT) data layers.
 *
 * Reads exclusively from the managed Layer model — no contextStore, no areas,
 * no CONTEXT_LAYER_METADATA lookup — so it is unaffected by future removals of
 * isInContext / contextStore (see "Future / second pass" in the MVT plan).
 *
 * Selects layers where type:"vector" AND tileUrl AND sourceLayer AND vectorStyle
 * are all set. AOI/GADM vectors have no vectorStyle and stay on the
 * AoiVectorTileLayers path, keeping the two renderers' inputs disjoint.
 *
 * Z-order: when parentLayerId is set, the fill sits just below its parent
 * raster tile layer (beforeId = tile-layer-{parentLayerId}). When absent,
 * falls back to RASTER_TOP_SENTINEL_ID (top of raster stack).
 */
function VectorDataLayers() {
  const allLayers = useMapStore((s) => s.layers);

  const styledVectorLayers = useMemo(
    () =>
      allLayers.filter(
        (l): l is StyledVectorLayer =>
          l.type === "vector" &&
          !!l.tileUrl &&
          !!l.sourceLayer &&
          !!l.vectorStyle
      ),
    [allLayers]
  );

  return (
    <>
      {styledVectorLayers.map((layer) => {
        const sourceId = `vector-data-source-${layer.id}`;
        const fillLayerId = `vector-data-fill-${layer.id}`;
        const lineLayerId = `vector-data-line-${layer.id}`;

        const colorExpr = buildColorExpression(layer.vectorStyle);
        const opacity = layer.visible ? (layer.opacity ?? 1) : 0;

        // Place this fill just below its parent raster so the vector sits
        // under the dataset layer it belongs to. Falls back to the sentinel
        // (top of raster stack) when there is no parent.
        const beforeId = layer.parentLayerId
          ? layerId(layer.parentLayerId)
          : RASTER_TOP_SENTINEL_ID;

        return (
          <Source
            key={layer.id}
            id={sourceId}
            type="vector"
            tiles={[layer.tileUrl]}
          >
            <Layer
              id={fillLayerId}
              type="fill"
              source-layer={layer.sourceLayer}
              beforeId={beforeId}
              paint={{
                "fill-color": colorExpr as never,
                "fill-opacity": opacity,
              }}
            />
            <Layer
              id={lineLayerId}
              type="line"
              source-layer={layer.sourceLayer}
              beforeId={beforeId}
              paint={{
                "line-color": colorExpr as never,
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  2,
                  0.4,
                  6,
                  0.8,
                  10,
                  1.5,
                ],
                "line-opacity": opacity,
              }}
            />
          </Source>
        );
      })}
    </>
  );
}

export default VectorDataLayers;
