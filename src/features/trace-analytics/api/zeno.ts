/**
 * Zeno API client for the superuser-gated trace endpoints
 * (port of tracey's utils/zeno_api.py):
 *
 * - GET /api/traces            list/filter (derived columns; never raw output)
 * - GET /api/traces/sessions   one row per conversation thread
 * - GET /api/traces/{id}       full detail (input/output fetched live from Langfuse)
 *
 * Langfuse stays the source of truth for raw traces; this client only reads
 * server-side derived data. Auth is the signed-in user's Resource Watch
 * bearer token — the API enforces superuser access.
 */

import { z } from "zod";
import { API_CONFIG } from "@/app/config/api";
import { getAuthHeaders } from "@/app/lib/api-client";
import { MAX_PAGE_SIZE } from "../model/config";
import { requestJson } from "./http";

const API_HOST = API_CONFIG.API_HOST;
import type {
  AgentMessage,
  SessionRow,
  TraceDetail,
  TraceListEntry,
  TraceRow,
} from "../model/types";

// ---------------------------------------------------------------------------
// Response schemas (validated at the boundary; extra fields pass through)
// ---------------------------------------------------------------------------

const TraceListItemSchema = z.looseObject({
  id: z.string(),
  trace_timestamp: z.string().nullish(),
  environment: z.string().nullish(),
  session_id: z.string().nullish(),
  user_id: z.string().nullish(),
  latency_seconds: z.coerce.number().nullish(),
  total_cost: z.coerce.number().nullish(),
  outcome: z.string().nullish(),
  prompt: z.string().nullish(),
  aoi_name: z.string().nullish(),
  aoi_type: z.string().nullish(),
  datasets_analysed: z.array(z.string().nullish()).nullish(),
  turn_tool_calls: z.coerce.number().nullish(),
  turn_tokens: z.coerce.number().nullish(),
  tool_error_count: z.coerce.number().nullish(),
  primary_dataset_name: z.string().nullish(),
  has_insight: z.boolean().nullish(),
  is_global: z.boolean().nullish(),
  language: z.string().nullish(),
  turn_index: z.coerce.number().nullish(),
  insight_created_this_turn: z.boolean().nullish(),
  datasets_analysed_this_turn: z.array(z.string().nullish()).nullish(),
});

type TraceListItem = z.infer<typeof TraceListItemSchema>;

const TraceListResponseSchema = z.looseObject({
  items: z.array(TraceListItemSchema).default([]),
  total: z.coerce.number().default(0),
});

const SessionItemSchema = z.looseObject({
  session_id: z.string().nullish(),
  user_id: z.string().nullish(),
  environment: z.string().nullish(),
  first_prompt: z.string().nullish(),
  first_timestamp: z.string().nullish(),
  last_timestamp: z.string().nullish(),
  turn_count: z.coerce.number().nullish(),
});

const SessionsResponseSchema = z.looseObject({
  items: z.array(SessionItemSchema).default([]),
  total: z.coerce.number().default(0),
});

const TraceDetailSchema = z.looseObject({
  id: z.string(),
  session_id: z.string().nullish(),
  environment: z.string().nullish(),
  trace_timestamp: z.string().nullish(),
  latency_seconds: z.coerce.number().nullish(),
  total_cost: z.coerce.number().nullish(),
  prompt: z.string().nullish(),
  answer: z.string().nullish(),
  raw_available: z.boolean().nullish(),
  input: z
    .looseObject({
      messages: z.array(z.record(z.string(), z.unknown())).default([]),
    })
    .nullish(),
  output: z
    .looseObject({
      messages: z.array(z.record(z.string(), z.unknown())).default([]),
    })
    .nullish(),
});

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Convert an inclusive [start, end] ISO-date range to half-open UTC instants. */
export function windowIso(
  startDate: string,
  endDate: string
): { start: string; end: string } {
  const start = new Date(`${startDate}T00:00:00Z`);
  const endExclusive = new Date(`${endDate}T00:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start: start.toISOString(), end: endExclusive.toISOString() };
}

/** Map one Zeno TraceListItem onto the analytics row shape. */
export function mapTraceRow(item: TraceListItem): TraceRow {
  const timestampMs = item.trace_timestamp
    ? Date.parse(item.trace_timestamp)
    : NaN;
  const timestamp = Number.isFinite(timestampMs)
    ? new Date(timestampMs).toISOString()
    : null;
  const joinDatasets = (values: readonly (string | null | undefined)[]) =>
    values
      .map((d) => String(d ?? "").trim())
      .filter(Boolean)
      .join(", ");
  const toolErrors = item.tool_error_count ?? 0;

  return {
    traceId: item.id,
    timestamp,
    date: timestamp ? timestamp.slice(0, 10) : null,
    environment: item.environment ?? null,
    sessionId: item.session_id ?? null,
    userId: String(item.user_id ?? "").trim(),
    latencySeconds: item.latency_seconds ?? null,
    totalCost: item.total_cost ?? null,
    outcome: item.outcome ?? null,
    prompt: item.prompt ?? "",
    aoiName: item.aoi_name ?? "",
    aoiType: item.aoi_type ?? "",
    datasetsAnalysed: joinDatasets(item.datasets_analysed ?? []),
    toolCallCount: Math.trunc(item.turn_tool_calls ?? 0),
    turnTokens: Math.trunc(item.turn_tokens ?? 0),
    hasInternalError: toolErrors > 0,
    primaryDatasetName: item.primary_dataset_name ?? null,
    hasInsight: item.has_insight ?? null,
    isGlobal: item.is_global ?? null,
    language: item.language ?? null,
    turnIndex: item.turn_index != null ? Math.trunc(item.turn_index) : null,
    insightCreatedThisTurn: item.insight_created_this_turn ?? null,
    datasetsAnalysedThisTurn: joinDatasets(
      item.datasets_analysed_this_turn ?? []
    ),
  };
}

function toListEntry(item: TraceListItem): TraceListEntry {
  return {
    id: item.id,
    prompt: item.prompt ?? "",
    traceTimestamp: item.trace_timestamp ?? null,
    sessionId: item.session_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export interface TracesFilter {
  readonly startDate: string;
  readonly endDate: string;
  readonly environment?: string;
  readonly outcome?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly promptContains?: string;
  /** Exact 1-based turn position within the conversation. */
  readonly turnIndex?: number;
  readonly minTurnIndex?: number;
  readonly maxTurnIndex?: number;
  /** Server-side alias for turnIndex === 1. */
  readonly firstTurnOnly?: boolean;
}

export interface PaginationOptions {
  readonly maxItems?: number;
  readonly signal?: AbortSignal;
  readonly onProgress?: (fetched: number, total: number) => void;
}

async function paginate<TItem>(
  url: string,
  baseParams: Record<string, string | number | undefined>,
  parsePage: (body: unknown) => { items: TItem[]; total: number },
  options: PaginationOptions
): Promise<TItem[]> {
  const { maxItems = 25000, signal, onProgress } = options;
  const headers = getAuthHeaders();

  const items: TItem[] = [];
  let offset = 0;
  for (;;) {
    const body = await requestJson(url, {
      headers,
      params: { ...baseParams, limit: MAX_PAGE_SIZE, offset },
      signal,
    });
    const page = parsePage(body);
    items.push(...page.items);
    offset += page.items.length;
    onProgress?.(items.length, page.total);
    if (
      !page.items.length ||
      offset >= page.total ||
      items.length >= maxItems
    ) {
      break;
    }
  }
  return items.slice(0, maxItems);
}

function filterParams(
  filter: TracesFilter
): Record<string, string | undefined> {
  const { start, end } = windowIso(filter.startDate, filter.endDate);
  return {
    start,
    end,
    environment: filter.environment || undefined,
    outcome: filter.outcome || undefined,
    user_id: filter.userId || undefined,
    session_id: filter.sessionId || undefined,
    prompt_contains: filter.promptContains || undefined,
    turn_index: filter.turnIndex != null ? String(filter.turnIndex) : undefined,
    min_turn_index:
      filter.minTurnIndex != null ? String(filter.minTurnIndex) : undefined,
    max_turn_index:
      filter.maxTurnIndex != null ? String(filter.maxTurnIndex) : undefined,
    first_turn_only: filter.firstTurnOnly ? "true" : undefined,
  };
}

/** Paginate GET /api/traces and return mapped analytics rows. */
export async function fetchTracesWindow(
  filter: TracesFilter,
  options: PaginationOptions = {}
): Promise<TraceRow[]> {
  const items = await paginate(
    `${API_HOST}/api/traces`,
    filterParams(filter),
    (body) => TraceListResponseSchema.parse(body),
    options
  );
  return items.map(mapTraceRow);
}

/** Paginate GET /api/traces and return raw picker entries (Trace Explorer). */
export async function fetchTraceList(
  filter: TracesFilter,
  options: PaginationOptions = {}
): Promise<TraceListEntry[]> {
  const items = await paginate(
    `${API_HOST}/api/traces`,
    filterParams(filter),
    (body) => TraceListResponseSchema.parse(body),
    options
  );
  return items.map(toListEntry);
}

/** Paginate GET /api/traces/sessions (one row per thread, newest first). */
export async function fetchSessions(
  filter: Pick<
    TracesFilter,
    "startDate" | "endDate" | "environment" | "userId"
  >,
  options: PaginationOptions = {}
): Promise<SessionRow[]> {
  const { start, end } = windowIso(filter.startDate, filter.endDate);
  const items = await paginate(
    `${API_HOST}/api/traces/sessions`,
    {
      start,
      end,
      environment: filter.environment || undefined,
      user_id: filter.userId || undefined,
    },
    (body) => SessionsResponseSchema.parse(body),
    options
  );
  return items
    .filter((item) => item.session_id)
    .map((item) => ({
      sessionId: String(item.session_id),
      userId: String(item.user_id ?? "").trim(),
      environment: item.environment ?? null,
      firstPrompt: item.first_prompt ?? "",
      firstTimestamp: item.first_timestamp ?? null,
      lastTimestamp: item.last_timestamp ?? null,
      turnCount: Math.trunc(item.turn_count ?? 0),
    }));
}

/** GET /api/traces/{id} — full detail incl. AgentState input/output. */
export async function fetchTraceDetail(
  traceId: string,
  signal?: AbortSignal
): Promise<TraceDetail> {
  const body = await requestJson(
    `${API_HOST}/api/traces/${encodeURIComponent(traceId)}`,
    { headers: getAuthHeaders(), signal }
  );
  const parsed = TraceDetailSchema.parse(body);
  return {
    id: parsed.id,
    sessionId: parsed.session_id ?? null,
    environment: parsed.environment ?? null,
    traceTimestamp: parsed.trace_timestamp ?? null,
    latencySeconds: parsed.latency_seconds ?? null,
    totalCost: parsed.total_cost ?? null,
    prompt: parsed.prompt ?? "",
    answer: parsed.answer ?? null,
    rawAvailable: parsed.raw_available ?? false,
    input: parsed.input
      ? { messages: parsed.input.messages as AgentMessage[] }
      : null,
    output: parsed.output
      ? { messages: parsed.output.messages as AgentMessage[] }
      : null,
    raw: body as Record<string, unknown>,
  };
}
