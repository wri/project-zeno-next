/**
 * Public API of the `aoi` entity (FSD slice).
 *
 * A reference area of interest found by name through `GET /api/aois`: one
 * place within a boundary set (GADM, KBA, WDPA, LandMark). Shared by the
 * map's Areas panel search and the new-dashboard area picker so both talk
 * to the endpoint the same way. Consumers import ONLY from this barrel.
 */
export {
  AOI_SEARCH_DEBOUNCE_MS,
  AOI_SEARCH_MIN_CHARS,
  AoiSearchResponseSchema,
  AoiSearchResultSchema,
  REFERENCE_AOI_SOURCE_LABELS,
  REFERENCE_AOI_SOURCES,
} from "./model/aoi-search";
export type { AoiSearchResult, ReferenceAoiSource } from "./model/aoi-search";
export { fetchAoiPage } from "./api/fetch-aoi-page";
export type { AoiPage, FetchAoiPageParams } from "./api/fetch-aoi-page";
export { useAoiSearch } from "./api/use-aoi-search";
export { placeMeta, placeToAoi, subtypeLabel } from "./lib/place";
