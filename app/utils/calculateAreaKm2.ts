import calculateArea from "@turf/area";

/**
 * Calculates the area of a GeoJSON object in square kilometers
 * @param geoJson - GeoJSON object (Feature, FeatureCollection, or Geometry)
 * @returns Area in square kilometers
 */
export function calculateAreaKm2(geoJson: GeoJSON.GeoJSON): number {
  const areaM2 = calculateArea(geoJson);
  return areaM2 / 1000000; // Convert m² to km²
}
