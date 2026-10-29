/**
 * Where the benchmark page data lives: the public wri/gnw-gold-evals repo,
 * fetched from GitHub raw (CORS `*`, no auth) at the commit each release
 * pins (`model/releases.ts`), so a push to gnw-gold-evals cannot change
 * what a deployed page shows.
 */

const REPO = "wri/gnw-gold-evals";

export function pagePath(runId: string): string {
  return `results/benchmark/pages/${runId}.json`;
}

export function rawUrl(ref: string, repoPath: string): string {
  return `https://raw.githubusercontent.com/${REPO}/${ref}/${repoPath}`;
}

/** The benchmark results folder at a commit, for the page's source link. */
export function resultsUrl(ref: string): string {
  return `https://github.com/${REPO}/tree/${ref}/results/benchmark`;
}
