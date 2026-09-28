// Validated client-side before POST /api/custom_areas creates one area.
export const ACCEPTED_FILE_TYPES = [".geojson"];
export const MAX_FILE_SIZE_MB = 1;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Parsed and validated server-side by POST /api/custom_areas/upload; the size
// cap mirrors the backend's MAX_UPLOAD_BYTES.
export const BATCH_UPLOAD_FILE_TYPES = [".csv", ".zip"];
export const BATCH_UPLOAD_MAX_FILE_SIZE_MB = 10;
export const BATCH_UPLOAD_MAX_FILE_SIZE =
  BATCH_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

/** Every file type an area upload accepts, GeoJSON first. */
export const UPLOAD_FILE_TYPES = [
  ...ACCEPTED_FILE_TYPES,
  ...BATCH_UPLOAD_FILE_TYPES,
];

// Area validation constants (in square kilometers)
export const MIN_AREA_KM2 = 0.1;
export const MAX_AREA_KM2 = 10000;

/** CSV and zipped shapefiles go to the batch endpoint, one area per row. */
export function isBatchUploadFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return BATCH_UPLOAD_FILE_TYPES.some((type) => lower.endsWith(type));
}
