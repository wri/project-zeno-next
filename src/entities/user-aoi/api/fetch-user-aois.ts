import { apiFetch } from "@/app/lib/api-client";

import { UserAoiListSchema, type UserAoi } from "../model/user-aoi";

const PAGE_SIZE = 100;

export async function readApiError(
  res: Response,
  fallback: string
): Promise<Error & { status?: number }> {
  const body = await res.json().catch(() => ({}));
  const error: Error & { status?: number } = new Error(
    body.detail || body.error || fallback
  );
  error.status = res.status;
  return error;
}

/** Fetch every entry of the user's library, following `X-Next-Offset`. */
export async function fetchUserAois(): Promise<UserAoi[]> {
  const entries: UserAoi[] = [];
  let offset: number | null = 0;

  while (offset !== null) {
    const res = await apiFetch(
      `/api/user_aois?limit=${PAGE_SIZE}&offset=${offset}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    if (!res.ok) {
      throw await readApiError(res, `Request failed: ${res.statusText}`);
    }
    entries.push(...UserAoiListSchema.parse(await res.json()));
    const next = res.headers.get("X-Next-Offset");
    offset = next === null ? null : Number(next);
  }

  return entries;
}
