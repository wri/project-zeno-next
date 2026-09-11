/**
 * Driven port for the eval-ledger data source (ADR 0003). The production
 * adapter reads the committed artefacts of the public gnw-gold-evals repo
 * from GitHub raw (`api/rest-evals-gateway.ts`); tests inject a fake.
 */

import type {
  CaseIndexEntry,
  CoverageDoc,
  EvalSet,
  RunDetail,
  RunIndex,
} from "./types";

export interface EvalsGateway {
  /** results/index.json — every committed run's header + buckets block. */
  runIndex(signal?: AbortSignal): Promise<RunIndex>;
  /** One full run file, addressed by the repo-relative path from the index. */
  run(path: string, signal?: AbortSignal): Promise<RunDetail>;
  /** cases/<store>/coverage.json for the set's case store. */
  coverage(set: EvalSet, signal?: AbortSignal): Promise<CoverageDoc>;
  /** cases/<store>/cases_index.json — the uid join table. */
  casesIndex(set: EvalSet, signal?: AbortSignal): Promise<CaseIndexEntry[]>;
}
