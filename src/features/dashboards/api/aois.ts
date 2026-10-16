import { readJson } from "./http";
import { AoiSearchResponseSchema, type AoiSearchResult } from "./schemas";

interface SearchAoisParams {
  name?: string;
  source?: string | null;
  limit?: number;
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
