import type { InsightRecord } from "@/src/entities/insight";

/**
 * Optional server-side filters for a insights list request. All omitted →
 * every insight the user owns.
 */
export interface InsightQuery {
  /** Scope to one conversation. */
  threadId?: string | null;
  /**
   * Scope to insights derived from one AOI. `aoiSource` and `aoiId` are the
   * (source, src_id) pair and must be supplied **together** — the backend
   * rejects one without the other (src_id is only unique per source).
   */
  aoiSource?: string;
  aoiId?: string;
}

/**
 * Driven port for reading the user's stored insights. The only seam the browse
 * feature uses to reach the backend; all transport knowledge lives in the
 * adapter (`api/`).
 */
export interface InsightsGateway {
  /**
   * Lists the authenticated user's insights, newest-first, optionally scoped by
   * `query`. Resolves to `[]` when unauthenticated.
   */
  list(query?: InsightQuery, signal?: AbortSignal): Promise<InsightRecord[]>;
}
