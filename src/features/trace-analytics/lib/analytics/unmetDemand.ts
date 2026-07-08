/**
 * Unmet demand: what users ask for that the agent does not serve.
 *
 * Groups prompts whose turn ended in a non-ANSWER outcome by normalized text,
 * so a PM can read repeated unserved asks as feature gaps. Also measures the
 * immediate same-prompt retry rate — users repeating themselves inside a
 * session is a strong friction signal.
 */

import type { TraceRow } from "../../model/types";
import { normalizePrompt } from "../format";

export interface UnmetPrompt {
  /** Representative original prompt (first occurrence, trimmed). */
  readonly prompt: string;
  readonly normalized: string;
  /** Unserved turns with this prompt. */
  readonly count: number;
  /** Distinct users who asked it. */
  readonly userCount: number;
  /** Outcome → count for this prompt's unserved turns. */
  readonly outcomes: Readonly<Record<string, number>>;
  /** Most frequent outcome (ties broken by first-seen order). */
  readonly topOutcome: string;
}

export interface UnmetDemand {
  /** Share of known-outcome turns that did not end in ANSWER. */
  readonly unservedShare: number;
  /** Share of known-outcome turns that ended in DEFER (agent declined). */
  readonly deferShare: number;
  /** Share of all turns that repeat the previous prompt in the same session. */
  readonly retryShare: number;
  /** Total distinct unserved prompt groups (before the top-N cap). */
  readonly distinctCount: number;
  readonly topPrompts: readonly UnmetPrompt[];
}

export interface UnmetDemandOptions {
  /** Maximum prompt groups returned (default 12). */
  readonly top?: number;
}

interface PromptGroup {
  prompt: string;
  normalized: string;
  count: number;
  users: Set<string>;
  outcomes: Map<string, number>;
}

function computeRetryShare(rows: readonly TraceRow[]): number {
  if (!rows.length) return 0;

  const bySession = new Map<string, TraceRow[]>();
  for (const row of rows) {
    const key = String(row.sessionId ?? "").trim();
    if (!key) continue;
    const list = bySession.get(key) ?? [];
    list.push(row);
    bySession.set(key, list);
  }

  let retries = 0;
  for (const turns of bySession.values()) {
    const ordered = [...turns].sort((a, b) =>
      String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? ""))
    );
    let prev = ordered.length ? normalizePrompt(ordered[0].prompt) : "";
    for (let i = 1; i < ordered.length; i++) {
      const curr = normalizePrompt(ordered[i].prompt);
      if (curr && curr === prev) retries += 1;
      prev = curr;
    }
  }
  return retries / rows.length;
}

/** Aggregate unserved prompts and friction shares for the window. */
export function computeUnmetDemand(
  rows: readonly TraceRow[],
  options: UnmetDemandOptions = {}
): UnmetDemand {
  const { top = 12 } = options;

  const known = rows.filter((row) => row.outcome != null);
  const unserved = known.filter((row) => row.outcome !== "ANSWER");
  const deferred = known.filter((row) => row.outcome === "DEFER");

  const groups = new Map<string, PromptGroup>();
  for (const row of unserved) {
    const normalized = normalizePrompt(row.prompt);
    if (!normalized) continue;
    const group = groups.get(normalized) ?? {
      prompt: row.prompt.trim(),
      normalized,
      count: 0,
      users: new Set<string>(),
      outcomes: new Map<string, number>(),
    };
    group.count += 1;
    if (row.userId) group.users.add(row.userId);
    const outcome = String(row.outcome);
    group.outcomes.set(outcome, (group.outcomes.get(outcome) ?? 0) + 1);
    groups.set(normalized, group);
  }

  const topPrompts = [...groups.values()]
    .sort((a, b) => b.count - a.count || b.users.size - a.users.size)
    .slice(0, top)
    .map((group) => {
      let topOutcome = "";
      let best = -1;
      for (const [outcome, count] of group.outcomes) {
        if (count > best) {
          best = count;
          topOutcome = outcome;
        }
      }
      return {
        prompt: group.prompt,
        normalized: group.normalized,
        count: group.count,
        userCount: group.users.size,
        outcomes: Object.fromEntries(group.outcomes),
        topOutcome,
      };
    });

  return {
    unservedShare: known.length ? unserved.length / known.length : 0,
    deferShare: known.length ? deferred.length / known.length : 0,
    retryShare: computeRetryShare(rows),
    distinctCount: groups.size,
    topPrompts,
  };
}
