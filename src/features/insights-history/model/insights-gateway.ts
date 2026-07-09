import type { InsightRecord } from "@/src/entities/insight";

/**
 * Driven port for reading the user's stored insights. The only seam the browse
 * feature uses to reach the backend; all transport knowledge lives in the
 * adapter (`api/`).
 */
export interface InsightsGateway {
  /**
   * Lists the authenticated user's insights, newest-first. A `threadId` scopes
   * the result to one conversation; `null`/`undefined` returns everything.
   * Resolves to `[]` when unauthenticated.
   */
  list(
    threadId?: string | null,
    signal?: AbortSignal
  ): Promise<InsightRecord[]>;
}
