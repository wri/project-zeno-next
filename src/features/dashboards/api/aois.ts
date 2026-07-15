import { apiFetch } from "@/app/lib/api-client";

import { AoiSearchResponseSchema, type AoiSearchResult } from "./schemas";
import type { ReferenceAoiSource } from "../model/dashboard-area";

export interface BrowseAoisParams {
  source: ReferenceAoiSource | "custom";
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

/**
 * Browse AOIs within a source: alphabetical when `name` is empty,
 * similarity-ranked fuzzy search when `name` is provided. Both modes
 * paginate via the `X-Next-Offset` response header.
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
  const trimmedName = name?.trim();
  if (trimmedName) params.set("name", trimmedName);

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
