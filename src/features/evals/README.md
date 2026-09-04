# evals

Superuser-only dashboard over the [gnw-gold-evals](https://github.com/wri/gnw-gold-evals)
ledger: results and coverage for the GOLD regression set and the CHALLENGE
quality set, rendered at `/evals` inside the settings shell.

## Data source

There is no backend. The slice fetches the repo's **committed artefacts from
GitHub raw** (the repo is public; CORS is `*`) and aggregates client-side:

| Artefact                         | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `results/index.json`             | Every committed run's header + buckets      |
| `results/<set>/runs/<id>.json`   | Full per-case rows for the run detail view  |
| `cases/<store>/coverage.json`    | Coverage sections + TARGETS.yml embedded    |
| `cases/<store>/cases_index.json` | uid join table (query text, cohorts, notes) |

The branch is pinned in `api/github.ts` (`NEXT_PUBLIC_EVALS_DATA_BRANCH`
overrides it per environment). The default is TEMPORARILY the tooling
branch `evals-dashboard-artefacts` so preview deploys work before
gnw-gold-evals#32 merges; flip it to `challenge-set` when #32 lands and to
`main` once challenge-set merges (#28) — merged feature branches get
deleted, at which point a stale pin 404s. GitHub raw caches ~5 minutes per
path, so the dashboard can lag a push by a few minutes.

The superuser gate (`app/evals/page.tsx`) is UX-only: the underlying data is
already public on GitHub.

## Segments

| Segment  | Contents                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------- |
| `model/` | Domain types, gateway port, scoring constants mirrored from `buckets.py`                           |
| `lib/`   | Pure TS ports of the scoring semantics (verdicts, Wilson CIs, rollup, trends) — no fetch, no React |
| `api/`   | GitHub raw gateway: zod validation, snake_case → camelCase mapping                                 |
| `ui/`    | Screen, URL-synced tabs, TanStack Query hooks, recharts charts                                     |

## Domain invariants (mirrored from gnw-gold-evals; update both together)

- Checks are tri-state: `1` pass, `0` fail, `null` not evaluated. Info-only
  checks never enter a verdict. A row with zero evaluated gating checks is
  **uncovered**, never a pass; an errored row is an **error**, never a failure.
- CHALLENGE rates: errors are availability, not quality; uncovered and stale
  rows are reported, never counted; every rate carries a Wilson 95% CI.
- Canonical CHALLENGE = prod, default profile, 3 trials. Everything else is
  badged **diagnostic** and its rates are directional. GOLD official tier is
  likewise 3 trials; 1-trial runs are smoke.
- Runs with differing `ff`, trial count, environment or caseset never share a
  trend line (`lib/comparability.ts`).
- Joins from run rows to cases are **uid-keyed** and must tolerate misses
  (`stale_case`); a run's `caseset_version` can lag the current store.

## Follow-ups

- Promote the copied `ui/primitives/` (KpiCard, ChartCard, InlineAlert) to
  `src/shared/ui` once a second consumer appears.
- Flip the `EVALS_DATA_BRANCH` default: to `challenge-set` after
  gnw-gold-evals#32, then to `main` after the challenge-set merge (#28).
- Upstream `strict_clean()` in `tools/challenge_rollup.py` iterates a dict
  where the ledger stores a list; the TS port (`lib/verdict.ts`) is correct.
