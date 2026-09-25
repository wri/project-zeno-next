/**
 * Where the North Star headline reads from. BENCHMARK is a sampled subset
 * of CHALLENGE, frozen annually, scored on 3-trial runs only (AJ,
 * 2026-09-25). Until the first freeze lands in the ledger
 * (cases/benchmark/<version>.json) the headline reads all of CHALLENGE.
 */

export type HeadlineSource =
  | { readonly kind: "challenge" }
  | {
      readonly kind: "benchmark";
      readonly version: string;
      /** ISO date the sample was frozen. */
      readonly frozen: string;
      readonly uids: ReadonlySet<string>;
      readonly minTrials: number;
    };

export const HEADLINE_SOURCE: HeadlineSource = { kind: "challenge" };
