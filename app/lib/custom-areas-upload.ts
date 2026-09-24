import { apiFetch } from "@/app/lib/api-client";
import {
  UploadCustomAreasResponseSchema,
  type UploadCustomAreasResponse,
} from "@/app/schemas/api/custom_areas/upload";

export class AreaUploadError extends Error {
  constructor(
    message: string,
    readonly details: string[] = []
  ) {
    super(message);
    this.name = "AreaUploadError";
  }
}

/**
 * Uploads a CSV or zipped shapefile to POST /api/custom_areas/upload, which
 * creates one custom area per row/feature. Validation is all-or-nothing: a 422
 * lists every problem in the file and nothing is created.
 */
export async function uploadCustomAreasFile(
  file: File
): Promise<UploadCustomAreasResponse> {
  const body = new FormData();
  // The backend picks the parser from the filename extension.
  body.append("file", file, file.name);

  // No Content-Type header: fetch adds the multipart boundary itself.
  const res = await apiFetch("/api/custom_areas/upload", {
    method: "POST",
    body,
  });

  if (res.ok) {
    return UploadCustomAreasResponseSchema.parse(await res.json());
  }

  const payload = await res.json().catch(() => null);
  const detail = payload?.detail;

  if (res.status === 422 && Array.isArray(detail?.errors)) {
    throw new AreaUploadError(
      "The file could not be uploaded. Fix these problems and try again:",
      detail.errors.map(String)
    );
  }
  if (
    (res.status === 413 || res.status === 415) &&
    typeof detail === "string"
  ) {
    throw new AreaUploadError(detail.charAt(0).toUpperCase() + detail.slice(1));
  }
  throw new AreaUploadError("Failed to upload file. Please try again.");
}
