export const ACCEPTED_FILE_TYPES = [".geojson"];
export const MAX_FILE_SIZE_MB = 1;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Parsed and validated server-side by POST /api/custom_areas/upload; the size
// cap mirrors the backend's MAX_UPLOAD_BYTES.
export const BATCH_UPLOAD_FILE_TYPES = [".csv", ".zip"];
export const BATCH_UPLOAD_MAX_FILE_SIZE_MB = 10;
export const BATCH_UPLOAD_MAX_FILE_SIZE =
  BATCH_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

// Area validation constants (in square kilometers)
export const MIN_AREA_KM2 = 0.1;
export const MAX_AREA_KM2 = 10000;
