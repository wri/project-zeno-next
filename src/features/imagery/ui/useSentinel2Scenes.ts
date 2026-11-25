import { useQuery } from "@tanstack/react-query";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { findScenes, type SceneSearchResult } from "../api/find-scenes";
import { toFeatureCollection } from "../lib/search";
import {
  encodeRecipe,
  type AoiRef,
  type Sentinel2Request,
} from "../model/request";

/** Loads one AOI's geometry (the caller's geometry client). */
export type AoiGeometryLoader = (
  aoi: AoiRef
) => Promise<Feature | FeatureCollection | Geometry>;

/**
 * The scenes of a Sentinel-2 request, for surfaces that render imagery from
 * a saved request rather than the explorer's layer store (dashboard map
 * widgets). Searches once per recipe; `findScenes` also caches per session.
 */
export function useSentinel2Scenes(
  request: Sentinel2Request | undefined,
  loadGeometry: AoiGeometryLoader
): SceneSearchResult | undefined {
  const { data } = useQuery({
    queryKey: ["sentinel2-scenes", request ? encodeRecipe(request) : null],
    queryFn: async () => {
      const shapes = await Promise.all(request!.aois.map(loadGeometry));
      return findScenes(request!, toFeatureCollection(shapes));
    },
    enabled: !!request,
    staleTime: Infinity,
  });
  return data;
}
