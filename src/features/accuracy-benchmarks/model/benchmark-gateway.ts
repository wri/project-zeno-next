/**
 * Driven port for the benchmark page data (ADR 0003). The production
 * adapter reads the committed artefacts of the public gnw-gold-evals repo
 * from GitHub raw (`api/github-benchmark-gateway.ts`); tests inject a fake.
 */

import type { BenchmarkPage, BenchmarkRunRef } from "./types";

export interface BenchmarkGateway {
  /** Every committed benchmark run that has page data, oldest first. */
  runs(signal?: AbortSignal): Promise<BenchmarkRunRef[]>;
  /** One run's page data, addressed by the repo-relative path from `runs`. */
  page(path: string, signal?: AbortSignal): Promise<BenchmarkPage>;
}
