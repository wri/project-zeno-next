import { LayerId, LayerName, selectLayerOptions } from "@/app/types/map";
import type { AnalysisSelection } from "@/app/store/selectAnalysisSlice";

interface FeatureProperties {
  [key: string]: unknown;
  adm_level?: number;
  gadm_id?: string;
}

interface Metadata {
  layer_id_mapping: Record<string, string>;
  gadm_subtype_mapping?: Record<string, string>;
  subregion_to_subtype_mapping?: Record<string, string>;
}

export function getAoiName(
  nameKeys: readonly string[],
  properties: { [key: string]: string }
): string {
  return nameKeys.reduce(
    (acc: string, key: string, idx: number) =>
      properties[key] ? `${properties[key]}${idx > 0 ? ", " : ""}${acc}` : acc,
    ""
  );
}

export function singularizeDatasetName(name: LayerName): string {
  if (name.endsWith("s")) {
    return name.slice(0, -1);
  }
  return name;
}

export function getSrcId(
  layerId: LayerId,
  featureProps: FeatureProperties,
  metadata: Metadata
): string | undefined {
  const layerKey = layerId.toLowerCase();

  if (layerKey === "gadm") {
    const admLevel = featureProps?.adm_level;
    if (admLevel !== undefined && admLevel !== null) {
      const gidKey = `gid_${admLevel}`;
      return String(featureProps?.[gidKey] || featureProps?.gadm_id || "");
    }
    return featureProps?.gadm_id ? String(featureProps.gadm_id) : undefined;
  }

  const idField = metadata.layer_id_mapping[layerKey];
  if (idField && featureProps?.[idField]) {
    return String(featureProps[idField]);
  }
}

export function getSubtype(
  layerId: LayerId,
  featureProps: FeatureProperties,
  metadata: Metadata
): string | undefined {
  const layerKey = layerId.toLowerCase();

  if (layerKey === "gadm") {
    const admLevel = featureProps?.adm_level;
    if (
      admLevel !== undefined &&
      admLevel !== null &&
      metadata.gadm_subtype_mapping
    ) {
      const gidKey = `GID_${admLevel}`;
      return metadata.gadm_subtype_mapping[gidKey];
    }
  }

  if (metadata.subregion_to_subtype_mapping?.[layerKey]) {
    return metadata.subregion_to_subtype_mapping[layerKey];
  }
}

/** Metadata the backend supplies for resolving ids/subtypes per layer. */
export interface SelectionMetadata {
  layer_id_mapping: Record<string, string>;
  gadm_subtype_mapping?: Record<string, string>;
  subregion_to_subtype_mapping?: Record<string, string>;
}

/**
 * Driving-side anti-corruption layer: turns a clicked map feature's properties
 * into a store `selectAnalysisSlice`, mirroring the extraction that lives inline in
 * `VectorAreasLayer` today (name / src id / subtype / source).
 */
export function toAreaSelection(
  layerId: LayerId,
  properties: Record<string, unknown>,
  metadata: SelectionMetadata
): AnalysisSelection {
  const config = selectLayerOptions.find((option) => option.id === layerId);
  const nameKeys = config?.nameKeys ?? [];

  return {
    name: getAoiName(nameKeys, properties as Record<string, string>),
    source: layerId.toLowerCase(),
    srcId: getSrcId(layerId, properties, metadata),
    subtype: getSubtype(layerId, properties, metadata),
  };
}
