import type { AOI } from "@/app/types/chat";

import type { UserAoi } from "../model/user-aoi";

/** Address a user AOI as the area it is, by its own source and id. */
export function userAoiToAoi(userAoi: UserAoi): AOI {
  return {
    name: userAoi.name,
    source: userAoi.source,
    src_id: userAoi.src_id,
    subtype: userAoi.subtype,
    ...(userAoi.bbox ? { bbox: userAoi.bbox } : {}),
  };
}

/** Whether an area is one of the user's AOIs. */
export function isUserAoi(
  userAois: readonly UserAoi[],
  source: string,
  srcId: string
): boolean {
  // Map layers name a source by its layer id ("GADM"), the API in lowercase.
  const wanted = source.toLowerCase();
  return userAois.some(
    (userAoi) => userAoi.source === wanted && userAoi.src_id === srcId
  );
}
