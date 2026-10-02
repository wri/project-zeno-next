/**
 * Public API of the `area-upload` feature (FSD slice).
 *
 * Uploading custom areas from a GeoJSON, CSV or zipped-shapefile file. One
 * implementation for the map areas panel and the new-dashboard screen, so the
 * accepted files, limits and error reporting cannot drift apart. Consumers
 * import ONLY from this barrel.
 */
export { AreaUploadDialog } from "./ui/AreaUploadDialog";
export { AreaUploadDropzone } from "./ui/AreaUploadDropzone";
export {
  useAreaUpload,
  type AreaUpload,
  type AreaUploadErrorState,
} from "./ui/useAreaUpload";
export { uploadedAreaRefs, type UploadedAreas } from "./model/uploaded-areas";
