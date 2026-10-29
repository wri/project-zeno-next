# ai-accuracy-scorecards

Superuser-only page at `/ai-accuracy-scorecards` showing how accurately Horizon
answers the BENCHMARK questions of [gnw-gold-evals](https://github.com/wri/gnw-gold-evals):
the headline (questions right on every one of three tries), where wrong
answers fail, accuracy by priority use case and by question type, every
question with what the agent did on each attempt, and the methodology, with a
plain-language reference of every check under "Show all checks". It is the
in-app version of the
published accuracy artifact, and a standalone page: no app header, only a link
back to the Horizon homepage.

## Data source

There is no backend. gnw-gold-evals precomputes the numbers for each benchmark
run (`tools/benchmark_page.py`) and commits them as
`results/benchmark/pages/<run_id>.json` (`schema_version` 1). The page shows
only the runs listed in `model/releases.ts`, and fetches each one's page file
from GitHub raw at the gnw-gold-evals commit its release pins, never at a
branch: a page can be rebuilt in place on the `benchmark` branch, so pinning
is what keeps a deployed page unchanged until an FE release. The page file is
parsed once in `api/` into the normalised types in `model/types.ts`, and a
schema mismatch throws rather than being papered over.

### Releasing a run

1. Push the canonical run and its page file to gnw-gold-evals `benchmark`.
2. Add `{ runId, ref, draft }` to `RELEASES` in `model/releases.ts`, with
   `ref` the full sha of a pushed commit that holds the page as you want it
   shown. `draft` alone decides whether the page marks the run as a draft
   (header and hero badges, trend, footer); the version name in the page
   data does not.
3. Open a PR to `develop`, check the page on staging, then release to `main`.

The dropdown names each release by the month in its run id ("October 2026");
when a month has more than one release, each of them is named by its day
("28 October 2026"). With one release the name shows in place of the
dropdown. A `?run=` that is not released opens the newest release.

Unlike `/evals`, this slice computes no scores: the page data already carries
the tiers, failure attribution and per-group stats, so the numbers match the
Python (`tools/challenge_rollup.py --benchmark`) by construction. `lib/` holds
only presentation helpers (tiers, the failure breakdown, filters, runs, check
grouping). One exception: the failure flow's "every time" and "some of the
time" standards regroup the per-question data (`lib/failures.ts`), because the
page data attributes failures only for the majority standard.

The check reference (`model/checks.ts`) mirrors the BENCHMARK branch's
`goldset.registry`, `goldset.buckets` and `src/goldset/evaluators/README.md`;
a check is listed as used when a question's expected fields switch it on.

The superuser gate (`app/ai-accuracy-scorecards/page.tsx`) is UX-only and holds
while the benchmark is a draft (AJ, 2026-10-23): the data is public on GitHub.

## Segments

| Segment  | Contents                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `model/` | Normalised page types, the gateway port, the release list, stage labels, use-case names, the check reference                      |
| `lib/`   | Pure presentation helpers (tiers, failure breakdown, filters, release naming and run picking)                                     |
| `api/`   | GitHub raw gateway at pinned commits: zod schemas for the wire page, mapping                                                      |
| `ui/`    | Screen, three views in the URL (`?view=`, `?run=`; `?uc=` opens All questions filtered to a use case; `#checks` opens the checks) |

## Invariants (mirrored from gnw-gold-evals; update both together)

- Headline = share of scored questions right on **every** trial. The flow
  chart opens on the same measure and switches to "right on at least 2 of 3"
  (the North Star, the page data's own attribution) or "at least 1 of 3".
- An attempt that got no reply counts as a wrong attempt (All questions labels
  each one). An attempt the harness could not score is
  left out; a question with no scored attempt is errored, and errored
  questions leave every denominator.
- A failed question counts once, at its earliest failing stage in the order
  scope, retrieval, analysis, explanation, output; "unattributed" when only
  shared checks failed. A question wrong on fewer than most trials counts at
  the earliest stage among the checks that failed on any trial, so it sits at
  the same stage under every standard.
- Rates are comparable only within a benchmark version: the trend draws the
  released runs of the open run's version.
