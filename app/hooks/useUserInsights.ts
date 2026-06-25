import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api-client";
import { ListInsightsResponseSchema } from "@/app/schemas/api/insights/get";
import { mapInsightsResponse } from "@/app/dashboards/lib/mapInsightResponse";
import type { InsightWidget } from "@/app/types/chat";

// Fetches the authenticated user's persisted insights from GET /api/insights
// and flattens them to the flat InsightWidget shape the dashboards UI renders.
// A 401 (unauthenticated) or other failure resolves to an empty list rather
// than throwing, so the dashboards prototype can fall back to its example
// fixtures instead of erroring on a logged-out / offline visit.
async function fetchUserInsights(): Promise<InsightWidget[]> {
  const res = await apiFetch("/api/insights", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return mapInsightsResponse(ListInsightsResponseSchema.parse(data));
}

export function useUserInsights() {
  const { data, isLoading, error } = useQuery<InsightWidget[]>({
    queryKey: ["userInsights"],
    queryFn: fetchUserInsights,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return { insights: data ?? [], isLoading, error };
}
