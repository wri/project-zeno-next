import { apiFetch } from "@/app/lib/api-client";

import {
  AoiSearchResponseSchema,
  type AoiSearchResult,
} from "../model/aoi-search";

export interface FetchAoiPageParams {
  /** Fuzzy name to search for. Omit to browse alphabetically. */
  name?: string;
  /**
   * Sources to search, sent as repeated `source` params. Several at once are
   * ranked together by the backend; none searches every source.
   */
  sources?: readonly string[];
  limit?: number;
  offset?: number;
  /** Aborts the request once its result is no longer wanted. */
  signal?: AbortSignal;
}

export interface AoiPage {
  results: AoiSearchResult[];
  /** Offset of the next page, or null on the last one (`X-Next-Offset`). */
  nextOffset: number | null;
}

async function apiError(res: Response): Promise<Error & { status?: number }> {
  let detail: string | undefined;
  try {
    const body = await res.json();
    detail =
      typeof body?.detail === "string"
        ? body.detail
        : (body?.error ?? body?.message);
  } catch {
    // Non-JSON error body; fall back to the status text.
  }
  const error: Error & { status?: number } = new Error(
    detail || `Request failed: ${res.statusText}`
  );
  error.status = res.status;
  return error;
}

/**
 * One page of `GET /api/aois`. With `name`, the backend runs a fuzzy,
 * similarity-ranked search; without it, results are browsed alphabetically.
 */
export async function fetchAoiPage({
  name,
  sources = [],
  limit = 50,
  offset = 0,
  signal,
}: FetchAoiPageParams): Promise<AoiPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  sources.forEach((source) => params.append("source", source));
  const trimmed = name?.trim();
  if (trimmed) params.set("name", trimmed);

  const res = await apiFetch(`/api/aois?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });
  if (!res.ok) throw await apiError(res);

  const results = AoiSearchResponseSchema.parse(await res.json());
  const nextHeader = res.headers.get("x-next-offset");
  const nextOffset =
    nextHeader !== null && nextHeader !== "" ? Number(nextHeader) : null;

  return {
    results,
    nextOffset: Number.isFinite(nextOffset) ? nextOffset : null,
  };
}
