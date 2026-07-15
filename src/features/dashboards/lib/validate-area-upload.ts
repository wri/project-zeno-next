import type { MultiPolygon, Polygon } from "geojson";
import {
  ACCEPTED_FILE_TYPES,
  MAX_AREA_KM2,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  MIN_AREA_KM2,
} from "@/app/constants/custom-areas";
import { calculateAreaKm2 } from "@/app/utils/calculateAreaKm2";
import { formatAreaWithUnits } from "@/app/utils/formatArea";

export type AreaUploadErrorType =
  | "none"
  | "file-too-large"
  | "file-empty"
  | "file-format-invalid"
  | "file-area-too-small"
  | "file-area-too-large";

export interface AreaUploadValidationResult {
  ok: boolean;
  errorType: AreaUploadErrorType;
  errorMessage: string;
  polygons?: Polygon[];
}

function extractPolygonFeatures(
  geoJsonData: GeoJSON.GeoJSON
): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];

  if (geoJsonData.type === "Feature") {
    const feature = geoJsonData as GeoJSON.Feature;
    if (
      feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon"
    ) {
      features.push(feature);
    }
    return features;
  }

  if (geoJsonData.type === "FeatureCollection") {
    return geoJsonData.features.filter(
      (feature) =>
        feature.geometry?.type === "Polygon" ||
        feature.geometry?.type === "MultiPolygon"
    );
  }

  if (geoJsonData.type === "Polygon" || geoJsonData.type === "MultiPolygon") {
    features.push({
      type: "Feature",
      geometry: geoJsonData,
      properties: {},
    });
  }

  return features;
}

/** Flattens Polygon and MultiPolygon geometries into individual polygons. */
function geometriesToPolygons(
  geometries: Array<Polygon | MultiPolygon | null | undefined>
): Polygon[] {
  const polygons: Polygon[] = [];

  for (const geometry of geometries) {
    if (!geometry) continue;
    if (geometry.type === "Polygon") {
      polygons.push(geometry);
      continue;
    }
    for (const coordinates of geometry.coordinates) {
      polygons.push({ type: "Polygon", coordinates });
    }
  }

  return polygons;
}

/** Validates a GeoJSON boundary upload for custom-area creation (map-free). */
export async function validateAreaUploadFile(
  file: File
): Promise<AreaUploadValidationResult> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      errorType: "file-too-large",
      errorMessage: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`,
    };
  }

  if (file.size === 0) {
    return {
      ok: false,
      errorType: "file-empty",
      errorMessage: "File is empty",
    };
  }

  if (
    !ACCEPTED_FILE_TYPES.some((type) => file.name.toLowerCase().endsWith(type))
  ) {
    return {
      ok: false,
      errorType: "file-format-invalid",
      errorMessage: `Only ${ACCEPTED_FILE_TYPES.join(", ")} files are supported`,
    };
  }

  let geoJsonData: GeoJSON.GeoJSON;
  try {
    geoJsonData = JSON.parse(await file.text());
  } catch {
    return {
      ok: false,
      errorType: "file-format-invalid",
      errorMessage: "Invalid JSON format",
    };
  }

  if (!geoJsonData || typeof geoJsonData !== "object") {
    return {
      ok: false,
      errorType: "file-format-invalid",
      errorMessage: "Invalid GeoJSON format",
    };
  }

  const features = extractPolygonFeatures(geoJsonData);
  if (features.length === 0) {
    return {
      ok: false,
      errorType: "file-format-invalid",
      errorMessage: "No valid Polygon or MultiPolygon features found",
    };
  }

  const areaSizeKm2 = calculateAreaKm2({
    type: "FeatureCollection",
    features,
  });

  if (areaSizeKm2 < MIN_AREA_KM2) {
    return {
      ok: false,
      errorType: "file-area-too-small",
      errorMessage: `Area is too small (${formatAreaWithUnits(
        areaSizeKm2
      )}). Minimum area is ${formatAreaWithUnits(MIN_AREA_KM2)}.`,
    };
  }

  if (areaSizeKm2 > MAX_AREA_KM2) {
    return {
      ok: false,
      errorType: "file-area-too-large",
      errorMessage: `Area is too large (${formatAreaWithUnits(
        areaSizeKm2
      )}). Maximum area is ${formatAreaWithUnits(MAX_AREA_KM2)}.`,
    };
  }

  const polygons = geometriesToPolygons(
    features.map((feature) => feature.geometry as Polygon | MultiPolygon | null)
  );

  if (polygons.length === 0) {
    return {
      ok: false,
      errorType: "file-format-invalid",
      errorMessage: "No valid Polygon features found",
    };
  }

  return {
    ok: true,
    errorType: "none",
    errorMessage: "",
    polygons,
  };
}
