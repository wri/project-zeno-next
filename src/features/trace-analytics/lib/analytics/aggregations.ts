/** Window-level aggregations over trace rows (port of tabs/analytics.py). */

import type { TraceRow } from "../../model/types";
import { finiteNumbers, mean, median, quantile } from "./stats";
import { normalizePrompt } from "../format";

// ---------------------------------------------------------------------------
// Summary statistics
// ---------------------------------------------------------------------------

export interface SummaryStats {
  readonly totalTraces: number;
  readonly uniqueUsers: number;
  readonly uniqueThreads: number;
  readonly successRate: number;
  readonly deferRate: number;
  readonly softErrorRate: number;
  readonly errorRate: number;
  readonly emptyRate: number;
  readonly totalCost: number;
  readonly meanCost: number;
  readonly medianCost: number;
  readonly p95Cost: number;
  readonly maxCost: number;
  readonly meanLatency: number;
  readonly medianLatency: number;
  readonly p95Latency: number;
  readonly maxLatency: number;
  readonly latencyCount: number;
  readonly costCount: number;
}

function outcomeRate(rows: readonly TraceRow[], outcome: string): number {
  if (!rows.length) return 0;
  return rows.filter((r) => r.outcome === outcome).length / rows.length;
}

export function computeSummaryStats(rows: readonly TraceRow[]): SummaryStats {
  const costs = finiteNumbers(rows.map((r) => r.totalCost));
  const latencies = finiteNumbers(rows.map((r) => r.latencySeconds));
  return {
    totalTraces: rows.length,
    uniqueUsers: new Set(rows.map((r) => r.userId.trim()).filter(Boolean)).size,
    uniqueThreads: new Set(rows.map((r) => r.sessionId).filter(Boolean)).size,
    successRate: outcomeRate(rows, "ANSWER"),
    deferRate: outcomeRate(rows, "DEFER"),
    softErrorRate: outcomeRate(rows, "SOFT_ERROR"),
    errorRate: outcomeRate(rows, "ERROR"),
    emptyRate: outcomeRate(rows, "EMPTY"),
    totalCost: costs.reduce((a, b) => a + b, 0),
    meanCost: mean(costs),
    medianCost: median(costs),
    p95Cost: quantile(costs, 0.95),
    maxCost: costs.length ? Math.max(...costs) : 0,
    meanLatency: mean(latencies),
    medianLatency: median(latencies),
    p95Latency: quantile(latencies, 0.95),
    maxLatency: latencies.length ? Math.max(...latencies) : 0,
    latencyCount: latencies.length,
    costCount: costs.length,
  };
}

// ---------------------------------------------------------------------------
// Prompt utilisation (prompts per user per day)
// ---------------------------------------------------------------------------

export interface PromptUtilisation {
  readonly userDays: number;
  readonly meanPrompts: number;
  readonly medianPrompts: number;
  readonly p95Prompts: number;
  /** One entry per (date, user) pair. */
  readonly userDayCounts: readonly number[];
  readonly daily: readonly {
    readonly date: string;
    readonly meanPromptsPerUser: number;
    readonly medianPromptsPerUser: number;
    readonly p95PromptsPerUser: number;
  }[];
}

export function computePromptUtilisation(
  rows: readonly TraceRow[]
): PromptUtilisation {
  const byDateUser = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const userId = row.userId.trim();
    if (!userId || !row.date) continue;
    const users = byDateUser.get(row.date) ?? new Map<string, number>();
    users.set(userId, (users.get(userId) ?? 0) + 1);
    byDateUser.set(row.date, users);
  }

  const allCounts: number[] = [];
  const daily = [...byDateUser.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, users]) => {
      const counts = [...users.values()];
      allCounts.push(...counts);
      return {
        date,
        meanPromptsPerUser: mean(counts),
        medianPromptsPerUser: median(counts),
        p95PromptsPerUser: quantile(counts, 0.95),
      };
    });

  return {
    userDays: allCounts.length,
    meanPrompts: mean(allCounts),
    medianPrompts: median(allCounts),
    p95Prompts: quantile(allCounts, 0.95),
    userDayCounts: allCounts,
    daily,
  };
}

// ---------------------------------------------------------------------------
// Categorical counts (datasets, AOI, starter prompts)
// ---------------------------------------------------------------------------

export interface LabelCount {
  readonly label: string;
  readonly count: number;
}

/** Count non-empty values, optionally exploding comma-separated lists. */
export function countCategories(
  values: readonly (string | null | undefined)[],
  options: { readonly explodeCsv?: boolean; readonly topN?: number } = {}
): LabelCount[] {
  const { explodeCsv = false, topN } = options;
  const counts = new Map<string, number>();
  for (const value of values) {
    const parts = explodeCsv
      ? String(value ?? "").split(",")
      : [String(value ?? "")];
    for (const part of parts) {
      const label = part.trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return topN ? sorted.slice(0, topN) : sorted;
}

export interface AoiNameCount extends LabelCount {
  /** Most frequent AOI type observed for this AOI name, if any. */
  readonly aoiType: string | null;
}

/** Top AOI names with their dominant AOI type. */
export function countAoiNames(
  rows: readonly TraceRow[],
  topN = 30
): AoiNameCount[] {
  const nameCounts = new Map<string, number>();
  const typeCounts = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const name = row.aoiName.trim();
    if (!name) continue;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    const type = row.aoiType.trim();
    if (type) {
      const types = typeCounts.get(name) ?? new Map<string, number>();
      types.set(type, (types.get(type) ?? 0) + 1);
      typeCounts.set(name, types);
    }
  }

  return [...nameCounts.entries()]
    .map(([label, count]) => {
      const types = typeCounts.get(label);
      let dominant: string | null = null;
      let best = 0;
      for (const [type, c] of types ?? []) {
        if (c > best) {
          best = c;
          dominant = type;
        }
      }
      return { label, count, aoiType: dominant };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, topN);
}

export interface StarterPromptMix {
  readonly starterCount: number;
  readonly otherCount: number;
  readonly breakdown: readonly LabelCount[];
}

/**
 * Classify prompts against the starter-prompt library. Prompts are compared
 * after normalization; matched prompts are labelled via labelMap (falling
 * back to the normalized prompt itself).
 */
export function computeStarterPromptMix(
  rows: readonly TraceRow[],
  starterPrompts: readonly string[],
  labelMap: Readonly<Record<string, string>>
): StarterPromptMix {
  const starterSet = new Set(
    starterPrompts.map(normalizePrompt).filter(Boolean)
  );
  const normalizedLabels = new Map(
    Object.entries(labelMap).map(([prompt, label]) => [
      normalizePrompt(prompt),
      label,
    ])
  );

  let starterCount = 0;
  let otherCount = 0;
  const breakdownCounts = new Map<string, number>();
  for (const row of rows) {
    const normalized = normalizePrompt(row.prompt);
    if (normalized && starterSet.has(normalized)) {
      starterCount += 1;
      const label = normalizedLabels.get(normalized) ?? normalized;
      breakdownCounts.set(label, (breakdownCounts.get(label) ?? 0) + 1);
    } else {
      otherCount += 1;
    }
  }

  const breakdown = [...breakdownCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { starterCount, otherCount, breakdown };
}

// ---------------------------------------------------------------------------
// Prompt length
// ---------------------------------------------------------------------------

export interface PromptLengths {
  readonly chars: readonly number[];
  readonly words: readonly number[];
}

/** Lengths of non-empty prompts, in characters and words. */
export function computePromptLengths(rows: readonly TraceRow[]): PromptLengths {
  const chars: number[] = [];
  const words: number[] = [];
  for (const row of rows) {
    const prompt = String(row.prompt ?? "");
    if (prompt.length > 0) chars.push(prompt.length);
    const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 0) words.push(wordCount);
  }
  return { chars, words };
}

// ---------------------------------------------------------------------------
// Internal vs user-visible errors
// ---------------------------------------------------------------------------

const USER_VISIBLE_OUTCOMES = new Set(["ERROR", "EMPTY", "SOFT_ERROR"]);

export interface ErrorOverlap {
  readonly total: number;
  readonly internalErrors: number;
  readonly userVisibleErrors: number;
  readonly recovered: number;
  readonly hiddenErrors: number;
  readonly both: number;
  readonly internalOnly: number;
  readonly userVisibleOnly: number;
  readonly noErrors: number;
}

export function computeErrorOverlap(rows: readonly TraceRow[]): ErrorOverlap {
  const total = rows.length;
  const internalErrors = rows.filter((r) => r.hasInternalError).length;
  const userVisibleErrors = rows.filter((r) =>
    USER_VISIBLE_OUTCOMES.has(String(r.outcome))
  ).length;
  const both = rows.filter(
    (r) => r.hasInternalError && USER_VISIBLE_OUTCOMES.has(String(r.outcome))
  ).length;
  const recovered = rows.filter(
    (r) => r.hasInternalError && r.outcome === "ANSWER"
  ).length;

  return {
    total,
    internalErrors,
    userVisibleErrors,
    recovered,
    hiddenErrors: Math.max(0, internalErrors - userVisibleErrors),
    both,
    internalOnly: internalErrors - both,
    userVisibleOnly: userVisibleErrors - both,
    noErrors: total - internalErrors - userVisibleErrors + both,
  };
}

// ---------------------------------------------------------------------------
// Tool usage
// ---------------------------------------------------------------------------

export interface ToolUsageStats {
  readonly avgToolCalls: number;
  readonly maxToolCalls: number;
  readonly toolErrorRate: number;
  readonly scatter: readonly {
    readonly toolCallCount: number;
    readonly latencySeconds: number;
    readonly outcome: string;
  }[];
}

export function computeToolUsage(rows: readonly TraceRow[]): ToolUsageStats {
  const toolCalls = finiteNumbers(rows.map((r) => r.toolCallCount));
  const scatter = rows
    .filter(
      (r) =>
        Number.isFinite(r.toolCallCount) &&
        typeof r.latencySeconds === "number" &&
        Number.isFinite(r.latencySeconds)
    )
    .map((r) => ({
      toolCallCount: r.toolCallCount,
      latencySeconds: r.latencySeconds as number,
      outcome: String(r.outcome ?? "Unknown"),
    }));

  return {
    avgToolCalls: mean(toolCalls),
    maxToolCalls: toolCalls.length ? Math.max(...toolCalls) : 0,
    toolErrorRate: rows.length
      ? rows.filter((r) => r.hasInternalError).length / rows.length
      : 0,
    scatter,
  };
}
