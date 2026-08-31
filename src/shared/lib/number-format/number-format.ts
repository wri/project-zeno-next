/**
 * Signed, thousands-separated — the design prints every value with an explicit
 * sign so a reader never has to infer direction from colour alone. Shared
 * across the curated LGMS charts so they can never drift apart.
 */
export const signed = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  signDisplay: "always",
});

/**
 * The same, ungrouped. The design writes the gross pair as `-750/+1600` — with
 * two numbers and a slash packed into one narrow mono line, a thousands
 * separator reads as another delimiter.
 */
export const signedPlain = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  signDisplay: "always",
  useGrouping: false,
});
