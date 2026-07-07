/** Per-day metric aggregation over trace rows (port of tracey's analytics tab). */

import type { TraceRow } from "../../model/types";
import { finiteNumbers, mean, quantile } from "./stats";

export interface DailyMetrics {
  readonly date: string;
  readonly traces: number;
  readonly uniqueUsers: number;
  readonly uniqueThreads: number;
  readonly successRate: number;
  readonly deferRate: number;
  readonly softErrorRate: number;
  readonly errorRate: number;
  readonly emptyRate: number;
  readonly meanCost: number;
  readonly p95Cost: number;
  readonly meanLatency: number;
  readonly p95Latency: number;
  readonly meanTokens: number;
  readonly p95Tokens: number;
}

function rate(rows: readonly TraceRow[], outcome: string): number {
  if (!rows.length) return 0;
  return rows.filter((r) => r.outcome === outcome).length / rows.length;
}

/** Group rows by calendar date and compute the daily metric set. */
export function computeDailyMetrics(rows: readonly TraceRow[]): DailyMetrics[] {
  const byDate = new Map<string, TraceRow[]>();
  for (const row of rows) {
    if (!row.date) continue;
    const bucket = byDate.get(row.date);
    if (bucket) {
      bucket.push(row);
    } else {
      byDate.set(row.date, [row]);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => {
      const costs = finiteNumbers(dayRows.map((r) => r.totalCost));
      const latencies = finiteNumbers(dayRows.map((r) => r.latencySeconds));
      // turnTokens defaults to 0 when the API omits it — 0 means "unknown".
      const tokens = finiteNumbers(dayRows.map((r) => r.turnTokens)).filter(
        (t) => t > 0
      );
      return {
        date,
        traces: dayRows.length,
        uniqueUsers: new Set(dayRows.map((r) => r.userId).filter(Boolean)).size,
        uniqueThreads: new Set(dayRows.map((r) => r.sessionId).filter(Boolean))
          .size,
        successRate: rate(dayRows, "ANSWER"),
        deferRate: rate(dayRows, "DEFER"),
        softErrorRate: rate(dayRows, "SOFT_ERROR"),
        errorRate: rate(dayRows, "ERROR"),
        emptyRate: rate(dayRows, "EMPTY"),
        meanCost: mean(costs),
        p95Cost: quantile(costs, 0.95),
        meanLatency: mean(latencies),
        p95Latency: quantile(latencies, 0.95),
        meanTokens: mean(tokens),
        p95Tokens: quantile(tokens, 0.95),
      };
    });
}
