import { useQuery } from "@tanstack/react-query";
import type { InsightRecord } from "@/src/entities/insight";
import type { InsightQuery, InsightsGateway } from "../model/insights-gateway";
import { RestInsightsGateway } from "../api/rest-insights-gateway";

// Composition root: the real adapter. Tests inject a fake gateway.
const defaultGateway: InsightsGateway = new RestInsightsGateway();

export interface UseUserInsights {
  insights: InsightRecord[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Reads the user's stored insights (newest-first). Pass a `query` to scope by
 * thread and/or AOI; omit it for everything. Each scope key is part of the
 * query key, so scoped and unscoped results are cached separately.
 */
export function useUserInsights(
  query?: InsightQuery,
  gateway: InsightsGateway = defaultGateway
): UseUserInsights {
  const { threadId = null, aoiSource, aoiId } = query ?? {};
  const result = useQuery({
    queryKey: ["userInsights", threadId, aoiSource ?? null, aoiId ?? null],
    queryFn: ({ signal }) =>
      gateway.list({ threadId, aoiSource, aoiId }, signal),
  });

  return {
    insights: result.data ?? [],
    isLoading: result.isLoading,
    error: (result.error as Error | null) ?? null,
  };
}
