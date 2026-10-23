import type { GroupStats } from "../model/types";

export type TierKey = "every" | "most" | "some" | "never";

export interface Tier {
  readonly key: TierKey;
  readonly label: string;
  /** How many of the three attempts were right. */
  readonly attempts: string;
  readonly count: number;
}

const TIER_LABELS: Readonly<Record<TierKey, [string, string]>> = {
  every: ["Accurate every time", "3 of 3 tries"],
  most: ["Accurate most of the time", "2 of 3 tries"],
  some: ["Accurate some of the time", "1 of 3 tries"],
  never: ["Never accurate", "0 of 3 tries"],
};

/**
 * Split a group's scored questions into four reliability tiers. The page
 * data carries the three cumulative shares (every time ⊆ majority ⊆ any
 * time), so the tiers are their differences.
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
  return (Object.keys(TIER_LABELS) as TierKey[]).map((key) => ({
    key,
    label: TIER_LABELS[key][0],
    attempts: TIER_LABELS[key][1],
    count: counts[key],
  }));
}

/** The tier legend, independent of any group. */
export const TIER_LEGEND: readonly Pick<Tier, "key" | "label">[] = (
  Object.keys(TIER_LABELS) as TierKey[]
).map((key) => ({ key, label: TIER_LABELS[key][0] }));
