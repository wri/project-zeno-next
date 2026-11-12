import { apiFetch } from "@/app/lib/api-client";

import type { ZapAddImageryArgs } from "../model/zap-plan";

/** The response of `POST /mosaic/create/{source}/{src_id}`. */
export interface MosaicCreated {
  mosaic_id: string;
  item_count?: number | null;
  date_start?: string | null;
  date_end?: string | null;
  mean_cloud_cover?: number | null;
  min_cloud_cover?: number | null;
  max_cloud_cover?: number | null;
}

/**
 * Builds the Sentinel-2 mosaic of an imagery step. A 404 (no scenes) or a 422
 * (the area is too large) throws with the message of the backend.
 */
export async function createMosaic(
  mosaic: ZapAddImageryArgs["mosaic"]
): Promise<MosaicCreated> {
  const { source, src_id, ...rest } = mosaic;
  const query = new URLSearchParams(
    Object.entries(rest).map(([key, value]) => [key, String(value)])
  );
  const response = await apiFetch(
    `/mosaic/create/${encodeURIComponent(source)}/${encodeURIComponent(src_id)}?${query}`,
    { method: "POST" }
  );
  if (!response.ok) {
    let detail: string | undefined;
    try {
      detail = (await response.json())?.detail;
    } catch {
      // No JSON body.
    }
    throw new Error(
      typeof detail === "string"
        ? detail
        : `The imagery failed (${response.status})`
    );
  }
  return (await response.json()) as MosaicCreated;
}
