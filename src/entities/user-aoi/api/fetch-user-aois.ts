import { apiFetch } from "@/app/lib/api-client";

import { UserAoiListSchema, type UserAoi } from "../model/user-aoi";
import { responseError } from "./http";

const PAGE_SIZE = 100;

/** Fetch all of the user's areas, following `X-Next-Offset`. */
export async function fetchUserAois(signal?: AbortSignal): Promise<UserAoi[]> {
  const userAois: UserAoi[] = [];
  let offset: number | null = 0;

  while (offset !== null) {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const res = await apiFetch(`/api/user_aois?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal,
    });
    if (!res.ok) throw await responseError(res);
    userAois.push(...UserAoiListSchema.parse(await res.json()));

    const nextHeader = res.headers.get("x-next-offset");
    const next =
      nextHeader !== null && nextHeader !== "" ? Number(nextHeader) : null;
    offset = Number.isFinite(next) ? next : null;
  }

  return userAois;
}
