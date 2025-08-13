import { FeatureCollection } from "geojson";

export interface GeometryResponse {
  geometry: FeatureCollection;
  [key: string]: unknown;
}

export interface SourceToIdMapping {
  [source: string]: string;
}

/**
 * Fetches geometry data for a given source and src_id
 * @param source - The data source (e.g., 'gadm', 'kba', 'wdpa', 'landmark')
 * @param srcId - The source-specific ID
 * @returns Promise resolving to geometry data
 */
export async function fetchGeometry(
  source: string,
  srcId: string
): Promise<GeometryResponse> {
  const response = await fetch(`/api/proxy/geometry/${source}/${srcId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch geometry: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetches the source to ID field mapping
 * @returns Promise resolving to the mapping object
 */
export async function fetchSourceToIdMapping(): Promise<SourceToIdMapping> {
  const response = await fetch(`/api/proxy/metadata`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.layer_id_mapping;
}