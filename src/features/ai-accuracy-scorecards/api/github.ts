/**
 * Where the benchmark page data lives: the public wri/gnw-gold-evals repo,
 * fetched from GitHub raw (CORS `*`, no auth) at the commit each release
 * pins (`model/releases.ts`), so a push to gnw-gold-evals cannot change
 * what a deployed page shows.
 */

import type { Release } from "../model/releases";

const REPO = "wri/gnw-gold-evals";

/** A released run's page file, at the commit its release pins. */
export function pageUrl({ runId, ref }: Release): string {
  return `https://raw.githubusercontent.com/${REPO}/${ref}/results/benchmark/pages/${runId}.json`;
}

/** The benchmark results folder at a commit, for the page's source link. */
export function resultsUrl(ref: string): string {
  return `https://github.com/${REPO}/tree/${ref}/results/benchmark`;
}
