import { getAoiName, getSrcId, getSubtype } from "@/app/utils/areaHelpers";
import { LayerId, selectLayerOptions } from "@/app/types/map";
import type { AreaSelection } from "../domain/area-selection";

/** Metadata the backend supplies for resolving ids/subtypes per layer. */
export interface SelectionMetadata {
  layer_id_mapping: Record<string, string>;
  gadm_subtype_mapping?: Record<string, string>;
  subregion_to_subtype_mapping?: Record<string, string>;
}

/**
 * Driving-side anti-corruption layer: turns a clicked map feature's properties
 * into a domain `AreaSelection`, mirroring the extraction that lives inline in
 * `VectorAreasLayer` today (name / src id / subtype / source).
 */
export function toAreaSelection(
  layerId: LayerId,
  properties: Record<string, unknown>,
  metadata: SelectionMetadata
): AreaSelection {
  const config = selectLayerOptions.find((option) => option.id === layerId);
  const nameKeys = config?.nameKeys ?? [];

  return {
    name: getAoiName(nameKeys, properties as Record<string, string>),
    source: layerId.toLowerCase(),
    srcId: getSrcId(layerId, properties, metadata),
    subtype: getSubtype(layerId, properties, metadata),
  };
}
