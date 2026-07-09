import { useQuery } from "@tanstack/react-query";
import type { InsightRecord } from "@/src/entities/insight";
import type { InsightsGateway } from "../model/insights-gateway";
import { RestInsightsGateway } from "../api/rest-insights-gateway";

// Composition root: the real adapter. Tests inject a fake gateway.
const defaultGateway: InsightsGateway = new RestInsightsGateway();

export interface UseUserInsights {
  insights: InsightRecord[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Reads the user's stored insights (newest-first). Pass a `threadId` to scope to
 * the current conversation; omit it for everything. The query key includes the
 * thread id, so filtered and unfiltered results are cached separately.
 */
export function useUserInsights(
  threadId?: string | null,
  gateway: InsightsGateway = defaultGateway
): UseUserInsights {
  const query = useQuery({
    queryKey: ["userInsights", threadId ?? null],
    queryFn: ({ signal }) => gateway.list(threadId, signal),
  });

  return {
    insights: query.data ?? [],
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
