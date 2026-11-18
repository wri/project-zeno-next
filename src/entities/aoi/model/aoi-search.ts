import { z } from "zod";

/** One AOI from `GET /api/aois` (a place within one of the boundary sets). */
export const AoiSearchResultSchema = z.object({
  source: z.string(),
  src_id: z.string(),
  name: z.string(),
  subtype: z.string(),
  // [west, south, east, north]; anything else is dropped, not a parse error.
  bbox: z
    .tuple([z.number(), z.number(), z.number(), z.number()])
    .optional()
    .catch(undefined),
});

export const AoiSearchResponseSchema = z.array(AoiSearchResultSchema);

export type AoiSearchResult = z.infer<typeof AoiSearchResultSchema>;

/** The boundary sets a reference AOI comes from, as the backend names them. */
export const REFERENCE_AOI_SOURCES = [
  "gadm",
  "kba",
  "wdpa",
  "landmark",
] as const;

export type ReferenceAoiSource = (typeof REFERENCE_AOI_SOURCES)[number];

/** Plural set names, for filter pills and section labels. */
export const REFERENCE_AOI_SOURCE_LABELS: Record<ReferenceAoiSource, string> = {
  gadm: "Administrative areas",
  kba: "Key biodiversity areas",
  wdpa: "Protected areas",
  landmark: "Indigenous lands",
};

/** Below this a fuzzy name search is too low-signal to send. */
export const AOI_SEARCH_MIN_CHARS = 3;
/** Wait this long after the last keystroke before searching. */
export const AOI_SEARCH_DEBOUNCE_MS = 300;
