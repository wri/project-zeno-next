/**
 * Public API of the `custom-area` entity (FSD slice).
 *
 * A user-owned area (drawn or uploaded). Holds the upload rules shared by
 * every upload entry point (map areas panel, new-dashboard screen) so they
 * cannot drift apart. Consumers import ONLY from this barrel.
 */
export {
  ACCEPTED_FILE_TYPES,
  BATCH_UPLOAD_FILE_TYPES,
  BATCH_UPLOAD_MAX_FILE_SIZE,
  BATCH_UPLOAD_MAX_FILE_SIZE_MB,
  isBatchUploadFile,
  MAX_AREA_KM2,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  MIN_AREA_KM2,
  UPLOAD_FILE_TYPES,
} from "./model/upload-limits";
export { validateAreaFile } from "./lib/validate-area-file";
export type {
  AreaFileErrorType,
  AreaFileValidation,
} from "./lib/validate-area-file";
export { customAreaToFeature } from "./lib/custom-area-feature";
export {
  AreaUploadError,
  uploadCustomAreasFile,
} from "./api/upload-custom-areas";
