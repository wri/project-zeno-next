import type { AOI } from "@/app/types/chat";
import { areaSourceLabel } from "@/app/utils/areaSourceLabel";

import type { AoiSearchResult } from "../model/aoi-search";

/**
 * GADM levels in words. The subtype is the same for every country, so this
 * can't say what a country calls the level ("Province", "Department").
 */
const GADM_LEVEL_LABELS: Record<string, string> = {
  country: "Country",
  "state-province": "State or province",
  "district-county": "District or county",
};

/** A backend subtype in words: `state-province` → "State province". */
export function subtypeLabel(subtype: string): string {
  const words = subtype.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

function gadmLevelLabel(subtype: string): string {
  return GADM_LEVEL_LABELS[subtype] ?? (subtypeLabel(subtype) || "Area");
}

/**
 * The meta line under a search hit's name. A GADM hit adds its country's
 * ISO code, read from the id's first segment (`BRA.14_1` → BRA), so the 30
 * places called "Santa Cruz" can be told apart. Other sources say which set
 * the place belongs to.
 */
export function placeMeta(hit: AoiSearchResult): string {
  if (hit.source !== "gadm") return areaSourceLabel(hit.source);
  const level = gadmLevelLabel(hit.subtype);
  if (hit.subtype === "country") return level;
  const iso = hit.src_id.split(".")[0];
  return iso ? `${level} · ${iso}` : level;
}

/** A search hit as the app's AOI (registry, layers, thumbnails, context). */
export function placeToAoi(hit: AoiSearchResult): AOI {
  return {
    name: hit.name,
    src_id: hit.src_id,
    source: hit.source,
    subtype: hit.subtype,
    ...(hit.bbox ? { bbox: hit.bbox } : {}),
  };
}
