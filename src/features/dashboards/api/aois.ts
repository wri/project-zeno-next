import { apiFetch } from "@/app/lib/api-client";

import { readJson } from "./http";
import { AoiSearchResponseSchema, type AoiSearchResult } from "./schemas";
import type { ReferenceAoiSource } from "../model/dashboard-area";

interface SearchAoisParams {
  name?: string;
  source?: string | null;
  limit?: number;
}

export interface BrowseAoisParams {
  source: ReferenceAoiSource | "custom";
  /** Fuzzy name to search for within the source. Omit to browse alphabetically. */
  name?: string;
  limit?: number;
  offset?: number;
}

export interface BrowseAoisPage {
  results: AoiSearchResult[];
  nextOffset: number | null;
}

async function parseApiError(
  res: Response
): Promise<Error & { status?: number }> {
  let detail: string | undefined;
  try {
    const body = await res.json();
    detail =
      typeof body?.detail === "string"
        ? body.detail
        : (body?.error ?? body?.message);
  } catch {
    // ignore
  }
  const error = new Error(detail || `Request failed: ${res.statusText}`);
  (error as Error & { status?: number }).status = res.status;
  return error as Error & { status?: number };
}

export async function searchAois({
  name,
  source,
  limit = 25,
}: SearchAoisParams): Promise<AoiSearchResult[]> {
  const params = new URLSearchParams();
  const trimmed = name?.trim();
  if (trimmed) params.set("name", trimmed);
  if (source) params.append("source", source);
  params.set("limit", String(limit));

  const data = await readJson<unknown>(`/api/aois?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return AoiSearchResponseSchema.parse(data);
}

/**
 * Search/browse AOIs within a source. With `name`, the backend runs a fuzzy,
 * similarity-ranked search; without it, results are browsed alphabetically.
 */
export async function browseAois({
  source,
  name,
  limit = 50,
  offset = 0,
}: BrowseAoisParams): Promise<BrowseAoisPage> {
  const params = new URLSearchParams({
    source,
    limit: String(limit),
    offset: String(offset),
  });
  const trimmed = name?.trim();
  if (trimmed) params.set("name", trimmed);

  const res = await apiFetch(`/api/aois?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw await parseApiError(res);

  const results = AoiSearchResponseSchema.parse(await res.json());
  const nextHeader = res.headers.get("x-next-offset");
  const nextOffset =
    nextHeader !== null && nextHeader !== "" ? Number(nextHeader) : null;

  return {
    results,
    nextOffset: Number.isFinite(nextOffset) ? nextOffset : null,
  };
}
