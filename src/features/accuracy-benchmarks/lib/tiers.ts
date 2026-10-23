import type { GroupStats } from "../model/types";
import { pct, share } from "./format";

/** The reliability tiers, best first. */
export const TIERS = [
  { key: "every", label: "Accurate every time", attempts: "3 of 3 tries" },
  { key: "most", label: "Accurate most of the time", attempts: "2 of 3 tries" },
  { key: "some", label: "Accurate some of the time", attempts: "1 of 3 tries" },
  { key: "never", label: "Never accurate", attempts: "0 of 3 tries" },
] as const;

export type TierKey = (typeof TIERS)[number]["key"];

export interface Tier {
  readonly key: TierKey;
  readonly label: string;
  /** How many of the three attempts were right. */
  readonly attempts: string;
  readonly count: number;
  readonly share: number | null;
}

/**
 * Split a group's scored questions into the four tiers. The page data
 * carries the three cumulative shares (every time ⊆ majority ⊆ any time),
 * so the tiers are their differences.
 */
export function tiersOf(stats: GroupStats): Tier[] {
  const n = stats.scored;
  const every = Math.round((stats.everyTime ?? 0) * n);
  const most = Math.round((stats.majority ?? 0) * n);
  const any = Math.round((stats.anyTime ?? 0) * n);
  const counts: Record<TierKey, number> = {
    every,
    most: most - every,
    some: any - most,
    never: n - any,
  };
  return TIERS.map((t) => ({
    ...t,
    count: counts[t.key],
    share: share(counts[t.key], n),
  }));
}

/** One line per tier, e.g. "58% accurate every time (65)". */
export function tierLines(stats: GroupStats): string[] {
  return tiersOf(stats).map(
    (t) => `${pct(t.share)} ${t.label.toLowerCase()} (${t.count})`
  );
}
