/**
 * Where the eval ledger lives: the public wri/gnw-gold-evals repo, fetched
 * from GitHub raw (CORS `*`, no auth). The branch is pinned here.
 *
 * TEMPORARY PIN: the default points at the tooling branch
 * `evals-dashboard-artefacts` (gnw-gold-evals#32) so ephemeral deploys work
 * before it merges. Flip to `challenge-set` when #32 lands, and to `main`
 * once challenge-set merges (gnw-gold-evals#28) — feature branches get
 * deleted on merge, at which point this pin 404s.
 * `NEXT_PUBLIC_EVALS_DATA_BRANCH` overrides it per environment.
 */

import type { EvalSet } from "../model/types";

export const EVALS_REPO_URL = "https://github.com/wri/gnw-gold-evals";

const RAW_BASE = "https://raw.githubusercontent.com/wri/gnw-gold-evals";

export const EVALS_DATA_BRANCH =
  process.env.NEXT_PUBLIC_EVALS_DATA_BRANCH || "evals-dashboard-artefacts";

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
