/**
 * Href builders for the evals screen. All views live on one route behind a
 * `?tab=` param; the set switcher (`?set=`) and run picker (`?run=`) ride
 * alongside it so deep links survive sharing and reloads.
 */

import type { EvalSet } from "../model/types";

export const EVALS_PATH = "/evals";

export const EVALS_TABS = ["overview", "trends", "runs", "coverage"] as const;

export type EvalsTab = (typeof EVALS_TABS)[number];

export function isEvalsTab(value: string | null): value is EvalsTab {
  return (EVALS_TABS as readonly string[]).includes(value ?? "");
}

export function isEvalSet(value: string | null): value is EvalSet {
  return value === "gold" || value === "challenge";
}

/** Build `/evals?tab=…` with optional extra params (empty values skipped). */
export function tabHref(
  tab: EvalsTab,
  params: Readonly<Record<string, string | undefined>> = {}
): string {
  const search = new URLSearchParams({ tab });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${EVALS_PATH}?${search.toString()}`;
}
