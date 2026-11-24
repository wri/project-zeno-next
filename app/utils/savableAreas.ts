import type { Layer } from "@/app/store/layerManagerSlice";
import {
  isInLibrary,
  type SourceAreaRef,
  type UserAoi,
} from "@/src/entities/user-aoi";

/**
 * List the source areas on a map layer that can be saved to the user's
 * library: each one with an id, not a custom area, and not saved yet.
 */
export function listSavableAreas(
  layer: Layer,
  library: readonly UserAoi[]
): SourceAreaRef[] {
  return (layer.featureRefs ?? []).flatMap(({ source, srcId }) => {
    const canonical = source.toLowerCase();
    if (srcId === undefined || canonical === "custom") return [];
    if (isInLibrary(library, canonical, srcId)) return [];
    return [{ source: canonical, src_id: srcId }];
  });
}
