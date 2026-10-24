/**
 * Where the benchmark page data lives: the public wri/gnw-gold-evals repo,
 * fetched from GitHub raw (CORS `*`, no auth). BENCHMARK stays on the
 * `benchmark` branch (decision 2026-10-21); `NEXT_PUBLIC_BENCHMARK_DATA_BRANCH`
 * overrides it, e.g. to read a branch before it merges.
 */

const RAW_BASE = "https://raw.githubusercontent.com/wri/gnw-gold-evals";

export const BENCHMARK_DATA_BRANCH =
  import.meta.env.NEXT_PUBLIC_BENCHMARK_DATA_BRANCH || "benchmark";

export const RUN_INDEX_PATH = "results/index.json";

export function rawUrl(repoPath: string): string {
  return `${RAW_BASE}/${BENCHMARK_DATA_BRANCH}/${repoPath}`;
}
