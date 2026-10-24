# accuracy-benchmarks

Superuser-only page at `/accuracy-benchmarks` showing how accurately Horizon
answers the BENCHMARK questions of [gnw-gold-evals](https://github.com/wri/gnw-gold-evals):
the headline (questions right on every one of three tries), where wrong
answers fail, accuracy by priority use case and by question type, every
question with what the agent did on each attempt, and the methodology. It is
the in-app version of the published accuracy artifact, and a standalone page:
no app header, only a link back to the Horizon homepage.

## Data source

There is no backend. gnw-gold-evals precomputes the numbers for each benchmark
run (`tools/benchmark_page.py`) and commits them; the page fetches them from
GitHub raw:

| Artefact                                | Purpose                                                  |
| --------------------------------------- | -------------------------------------------------------- |
| `results/index.json`                    | Benchmark runs, their version, canonical flag and `page` |
| `results/benchmark/pages/<run_id>.json` | One run's page data (`schema_version` 1)                 |

The branch defaults to `benchmark`, where BENCHMARK lives (decision
2026-10-21); `NEXT_PUBLIC_BENCHMARK_DATA_BRANCH` overrides it. The page file is
parsed once in `api/` into the normalised types in `model/types.ts`, and a
schema mismatch throws rather than being papered over. GitHub raw caches
about 5 minutes per path.

Unlike `/evals`, this slice computes no scores: the page data already carries
the tiers, failure attribution and per-group stats, so the numbers match the
Python (`tools/challenge_rollup.py --benchmark`) by construction. `lib/` holds
only presentation helpers (tiers, the failure breakdown, filters, runs).

The superuser gate (`app/accuracy-benchmarks/page.tsx`) is UX-only and holds
while the benchmark is a draft (AJ, 2026-10-23): the data is public on GitHub.

## Segments

| Segment  | Contents                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------- |
| `model/` | Normalised page types, the gateway port, stage and check labels                                       |
| `lib/`   | Pure presentation helpers (tiers, failure breakdown, filters, run picking)                            |
| `api/`   | GitHub raw gateway: zod schemas for the wire page, mapping                                            |
| `ui/`    | Screen, three views in the URL (`?view=`, `?run=`; `?uc=` opens All questions filtered to a use case) |

## Invariants (mirrored from gnw-gold-evals; update both together)

- Headline = share of scored questions right on **every** trial; the flow
  chart still counts "right on at least 2 of 3" (the North Star), and says so.
- Errored questions leave every denominator.
- A failed question counts once, at its earliest failing stage in the order
  scope, retrieval, analysis, explanation, output; "unattributed" when only
  shared checks failed.
- Rates are comparable only within a benchmark version: the trend draws the
  canonical runs of the open run's version.
