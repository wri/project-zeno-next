import type { GroupStats, TierKey } from "../model/types";
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
} as const satisfies Record<TierKey, object>;

export type { TierKey };

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

/** A group's scored questions in the four tiers, with their shares. */
export function tiersOf(stats: GroupStats): Tier[] {
  return TIERS.map((t) => ({
    ...t,
    count: stats.tiers[t.key],
    share: share(stats.tiers[t.key], stats.scored),
  }));
}

/** One line per tier, e.g. "58% accurate every time (65)". */
export function tierLines(stats: GroupStats): string[] {
  return tiersOf(stats).map(
    (t) => `${pct(t.share)} ${t.label.toLowerCase()} (${t.count})`
  );
}
