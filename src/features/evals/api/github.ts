/**
 * Where the eval ledger lives: the public wri/gnw-gold-evals repo, fetched
 * from GitHub raw (CORS `*`, no auth). The branch is pinned here because
 * the gold/challenge split and the dashboard artefacts currently exist
 * only on `challenge-set` — flip the default to `main` once that branch
 * merges. `NEXT_PUBLIC_EVALS_DATA_BRANCH` overrides it for development
 * (e.g. pointing at a tooling branch before it merges).
 */

import type { EvalSet } from "../model/types";

export const EVALS_REPO_URL = "https://github.com/wri/gnw-gold-evals";

const RAW_BASE = "https://raw.githubusercontent.com/wri/gnw-gold-evals";

export const EVALS_DATA_BRANCH =
  process.env.NEXT_PUBLIC_EVALS_DATA_BRANCH || "challenge-set";

/** GOLD's working store is cases/v2; CHALLENGE has its own store. */
const STORE_DIR: Record<EvalSet, string> = {
  gold: "v2",
  challenge: "challenge",
};

export function rawUrl(repoPath: string): string {
  return `${RAW_BASE}/${EVALS_DATA_BRANCH}/${repoPath}`;
}

export const RUN_INDEX_PATH = "results/index.json";

export function coveragePath(set: EvalSet): string {
  return `cases/${STORE_DIR[set]}/coverage.json`;
}

export function casesIndexPath(set: EvalSet): string {
  return `cases/${STORE_DIR[set]}/cases_index.json`;
}
