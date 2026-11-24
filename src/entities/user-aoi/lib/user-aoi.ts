import type { AOI } from "@/app/types/chat";

import type { UserAoi } from "../model/user-aoi";

/** Address a library entry as the area it is, by its own source and id. */
export function userAoiToAoi(entry: UserAoi): AOI {
  return {
    name: entry.name,
    source: entry.source,
    src_id: entry.src_id,
    subtype: entry.subtype,
    ...(entry.bbox ? { bbox: entry.bbox } : {}),
  };
}

/** Whether an area is in the user's library. */
export function isInLibrary(
  entries: readonly UserAoi[],
  source: string,
  srcId: string
): boolean {
  // Map layers name a source by its layer id ("GADM"), the API in lowercase.
  const wanted = source.toLowerCase();
  return entries.some(
    (entry) => entry.source === wanted && entry.src_id === srcId
  );
}
