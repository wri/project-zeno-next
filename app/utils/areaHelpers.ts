import {
  CONCESSION_STYLES,
  LayerId,
  LayerName,
  selectLayerOptions,
} from "@/app/types/map";
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

function getAoiName(
  nameKeys: readonly string[],
  properties: Record<string, unknown>
): string {
  // Later keys come first ("Lisboa, Portugal"). The separator goes in only
  // between two values, so a missing earlier key leaves no trailing comma.
  return nameKeys.reduce(
    (acc: string, key: string) =>
      properties[key] ? `${properties[key]}${acc ? ", " : ""}${acc}` : acc,
    ""
  );
}

/**
 * The name of a clicked or hovered feature on a boundary layer. A concession
 * without a name or company falls back to its company group, then to its
 * type and country, as the backend names it ("Logging concession, CAN"):
 * the name keys the picked area's map layer, so it must never be empty.
 */
export function getFeatureName(
  layerId: LayerId,
  properties: Record<string, unknown>
): string {
  const config = selectLayerOptions.find((option) => option.id === layerId);
  const name = getAoiName(config?.nameKeys ?? [], properties);
  const unnamed = CONCESSION_STYLES[layerId]?.unnamed;
  if (name || !unnamed) return name;
  if (properties.comp_group) return String(properties.comp_group);
  return properties.iso3 ? `${unnamed}, ${properties.iso3}` : unnamed;
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
  return {
    name: getFeatureName(layerId, properties),
    source: layerId.toLowerCase(),
    srcId: getSrcId(layerId, properties, metadata),
    subtype: getSubtype(layerId, properties, metadata),
  };
}
