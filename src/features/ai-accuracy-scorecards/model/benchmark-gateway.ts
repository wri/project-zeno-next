/**
 * Driven port for the benchmark page data (ADR 0003). The production
 * adapter reads the committed artefacts of the public gnw-gold-evals repo
 * from GitHub raw, at the commit each release pins
 * (`api/github-benchmark-gateway.ts`); tests inject a fake.
 */

import type { Release } from "./releases";
import type { BenchmarkPage } from "./types";

export interface BenchmarkGateway {
  /** One released run's page data. */
  page(run: Release, signal?: AbortSignal): Promise<BenchmarkPage>;
}
