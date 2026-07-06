import { z } from "zod";

// GET /api/aois — fuzzy area search / browse across sources (gadm, kba,
// wdpa, landmark, custom). Auth required; custom areas are scoped to the
// caller. Paging via X-Next-Offset response header (unused by the UI yet).

export const AoiSearchResultSchema = z.object({
  source: z.string(),
  src_id: z.string(),
  name: z.string(),
  subtype: z.string(),
  // [west, south, east, north]. The backend defaults this to the whole world
  // when the real extent is unknown — treat that as "no bbox".
  bbox: z.array(z.number()).length(4).nullish(),
});

export const AoiSearchResponseSchema = z.array(AoiSearchResultSchema);

export type AoiSearchResult = z.infer<typeof AoiSearchResultSchema>;

const WORLD_EXTENT = [-180, -90, 180, 90] as const;

/** True when the bbox is the backend's world-extent placeholder (or absent). */
export function isPlaceholderBbox(bbox: AoiSearchResult["bbox"]): boolean {
  if (!bbox) return true;
  return bbox.every((v, i) => v === WORLD_EXTENT[i]);
}
