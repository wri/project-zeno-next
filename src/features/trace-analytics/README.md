# features/trace-analytics

Superuser-only trace analytics (Analytics, Trace Explorer, Conversation
Browser), ported from the standalone `gnw-trace-analytics` dashboard into an
FSD slice. Mounted at `/trace-analytics` inside `SettingsShell`; the entry is
hidden for non-superusers and the Zeno API enforces superuser on every
endpoint (the client gate is UX only).

## Layout (FSD segments, dependencies point "down")

| Segment     | Role                                                                                                                           | May depend on            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `model/`    | Pure core: domain types (`TraceRow`, `SessionRow`, …), constants, date helpers, the filters store and fetched-data stores.     | `model/` only            |
| `lib/`      | Pure, unit-tested helpers: ALL metric/aggregation logic (`lib/analytics/*`), trace parsing, CSV, formatting, user-id filters.  | `model/`                 |
| `api/`      | Zeno API adapters (zod-validated fetch, offset pagination): `zeno.ts`, `users.ts`, `http.ts`. Auth via `@/app/lib/api-client`. | `model/`, `lib/`         |
| `ui/`       | React edge: `TraceAnalyticsScreen` (URL-synced tabs), the three views, chart primitives (`ui/charts`), section components.     | `model/`, `api/`, `lib/` |
| `fixtures/` | Internal-user id list (exclusion toggle) and starter prompts.                                                                  | —                        |

Consumers import the slice **only** through its public API barrel
([`index.ts`](./index.ts)). The dependency direction is enforced by
[`tests/architecture`](../../../tests/architecture) (ADR 0010).

## Domain invariants — violating these produces wrong numbers

- `outcome` (ANSWER/DEFER/SOFT_ERROR/ERROR/EMPTY) is assigned **server-side**
  in project-zeno (`src/api/services/langfuse/parse.py::derive_outcome`).
  Never re-map the codes silently.
- `lib/analytics/outcomeRefine.ts` is a client-side _derived view_ (degraded
  answers, answered-from-context, UI-event quarantine, timeout suspects). It
  must never mutate `row.outcome`.
- `datasetsAnalysed` is **thread-cumulative**, not per-turn — that is exactly
  what makes the answered-from-context rescue valid.
- `turnTokens === 0` means "unknown", not zero — filter `> 0` before stats.
- Quantiles (`lib/analytics/stats.ts`) use pandas-compatible linear
  interpolation so numbers match historical reports. Don't swap methods.
- `language` comes from the API when present; `lib/analytics/language.ts`
  (franc) only fills nulls and carries an English-ambiguity guard. Never
  overwrite a server value.
- Machine users (`isMachineUserId`) are always excluded; fixture-listed
  internal users only when the "Exclude internal users" toggle is on.

## Charts

- Build from the primitives: `ChartCard`, `ChartTooltip`, `ChartLegend`,
  `palette.ts`. The categorical palette is CVD-validated and assigned in
  **fixed order — never cycle hues** past the palette; fold the tail into
  "Other" or switch to bars.
- Outcomes: use `OUTCOME_COLORS` + `OUTCOME_SEVERITY_ORDER` (best → worst) and
  `outcomeOrderIndex` for sorting, so ordering never depends on the data.
- Pass `keepPayloadOrder` as the recharts `Legend itemSorter` — the default
  sorts by value and breaks the fixed ordering.
- If a series' stroke is not its identity color (e.g. white seams between
  stacked areas), pass `colorMap` to `ChartTooltip`/`ChartLegend` — otherwise
  the swatches render invisible.

## Navigation

All three views share one route behind `?tab=` — deep links carry extra
params (`?tab=traces&session=…`, `?tab=traces&trace=…`,
`?tab=traces&prompt=…`, `?tab=conversations&user=…`). Build hrefs with
`ui/links.ts#tabHref`, never hardcode.

## Signals tab (added in the port)

The Analytics view gained a PM-focused **Signals** sub-tab on top of the
original five:

- `lib/analytics/funnel.ts` — session-level journey funnel (conversation →
  area selected → dataset analysed → insight delivered). Stages are
  cumulative, so counts always decrease monotonically.
- `lib/analytics/unmetDemand.ts` — unserved asks grouped by normalized
  prompt (feature-gap candidates), plus unserved/defer shares and the
  immediate same-prompt retry rate. Table rows deep-link into the Trace
  Explorer via `?tab=traces&prompt=…`.
