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

/** Reliability tiers: the pass colour at falling opacity; "never" is an
 * outlined empty swatch. */
export const TIER_OPACITY: Readonly<Record<TierKey, number>> = {
  every: 1,
  most: 0.55,
  some: 0.25,
  never: 0,
};
