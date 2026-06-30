import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api-client";
import {
  InsightResponseSchema,
  type InsightResponse,
} from "@/app/schemas/api/insights/get";
import { mapInsightsResponse } from "@/app/dashboards/lib/mapInsightResponse";
import type { InsightWidget } from "@/app/types/chat";

// Fetches the authenticated user's persisted insights from GET /api/insights
// and flattens them to the flat InsightWidget shape the dashboards UI renders.
// A 401 (unauthenticated) or other failure resolves to an empty list rather
// than throwing, so the dashboards prototype can fall back to its example
// fixtures instead of erroring on a logged-out / offline visit.
async function fetchUserInsights(threadId?: string): Promise<InsightWidget[]> {
  const query = threadId ? `?thread_id=${encodeURIComponent(threadId)}` : "";
  const res = await apiFetch(`/api/insights${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  // Validate each insight independently rather than parsing the whole array
  // atomically: a single malformed record (e.g. a future field change) would
  // otherwise throw and silently blank the entire panel. Bad rows are dropped
  // and logged in dev so drift is visible instead of mysterious emptiness.
  const valid: InsightResponse[] = [];
  for (const row of data) {
    const parsed = InsightResponseSchema.safeParse(row);
    if (parsed.success) {
      valid.push(parsed.data);
    } else if (process.env.NODE_ENV !== "production") {
      console.warn(
        "useUserInsights: dropping unparseable insight from /api/insights",
        parsed.error.issues
      );
    }
  }
  return mapInsightsResponse(valid);
}

// Pass a `threadId` to scope the result to a single conversation
// (GET /api/insights?thread_id=…); omit it for every insight the user has
// generated across all threads.
export function useUserInsights(threadId?: string) {
  const { data, isLoading, error } = useQuery<InsightWidget[]>({
    queryKey: ["userInsights", threadId ?? null],
    queryFn: () => fetchUserInsights(threadId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return { insights: data ?? [], isLoading, error };
}
