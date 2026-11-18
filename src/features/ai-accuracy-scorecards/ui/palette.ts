/**
 * Stage colours: the evals dashboard's dimension hues, re-stepped to pass a
 * colour-vision check (same values as the published accuracy page).
 */

import type { AttributionKey } from "../model/types";
import type { TierKey } from "../lib/tiers";

export const PASS_COLOR = "#2e9b5f";

export const STAGE_COLORS: Readonly<Record<AttributionKey, string>> = {
  scope: "#7b5cb8",
  retrieval: "#c24a4a",
  analysis: "#b88a12",
  explanation: "#2f86c9",
  output: "#b0457e",
  unattributed: "#8a8f98",
};

/**
 * `color` at `percent` strength, mixed into the panel colour rather than
 * faded with opacity: an opaque tint reads the same on any ground (the
 * chart, its still-to-come area, the dark tooltip) instead of darkening over
 * a dark one.
 */
export const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, var(--chakra-colors-bg-panel))`;

/** Reliability tiers: the pass colour at falling strength, down to the
 * empty "never" swatch. */
export const TIER_COLORS: Readonly<Record<TierKey, string>> = {
  every: PASS_COLOR,
  most: tint(PASS_COLOR, 55),
  some: tint(PASS_COLOR, 25),
  never: "var(--chakra-colors-bg-muted)",
};
