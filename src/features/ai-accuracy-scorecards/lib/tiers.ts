import type { GroupStats } from "../model/types";
import { pct, share } from "./format";

/**
 * Every tier's wording, in one place. The first three double as the
 * failure flow's standards (count a question as accurate when it is right
 * on all, at least 2 or at least 1 of its tries), so they also carry the
 * standard's toggle option, its "accurate on …" phrase and the chart's
 * short form.
 */
export const TIER_COPY = {
  every: {
    label: "Accurate every time",
    attempts: "3 of 3 tries",
    option: "Every time",
    tries: "all 3 tries",
    leaf: "3 of 3 tries",
  },
  most: {
    label: "Accurate most of the time",
    attempts: "2 of 3 tries",
    option: "Most of the time",
    tries: "at least 2 of 3 tries",
    leaf: "2+ of 3 tries",
  },
  some: {
    label: "Accurate some of the time",
    attempts: "1 of 3 tries",
    option: "Some of the time",
    tries: "at least 1 of 3 tries",
    leaf: "1+ of 3 tries",
  },
  never: { label: "Never accurate", attempts: "0 of 3 tries" },
} as const;

export type TierKey = keyof typeof TIER_COPY;

/** The reliability tiers, best first. */
export const TIERS = (["every", "most", "some", "never"] as const).map(
  (key) => ({ key, ...TIER_COPY[key] })
);

/** The failure flow's standards, strictest first. */
export const STANDARDS = ["every", "most", "some"] as const;
export type Standard = (typeof STANDARDS)[number];

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
