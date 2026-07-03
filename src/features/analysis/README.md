# features/analysis

Boundary-analysis feature, organized as a Feature-Sliced Design (FSD) slice. See
[docs/architecture](../../../docs/architecture/README.md) for the design and the _why_.

## Layout (FSD segments, dependencies point "down")

| Segment  | Role                                                                                                                                                                  | May depend on            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `model/` | Pure core: value objects, ports (`AnalysisGateway`, `Clock`, `AnalysisService`), the `LROAnalysisService` state machine, the selection store, the `InsightSink` port. | `model/` only            |
| `lib/`   | Pure helpers / generic impls: `SystemClock`, `toAreaSelection`, `analysisResultToWidgets`.                                                                            | `model/`                 |
| `api/`   | Backend adapters: `RestAnalysisGateway`, `StubAnalysisService` (HTTP allowed).                                                                                        | `model/`, `lib/`         |
| `ui/`    | React edge + composition root: `useAnalysis`, `AnalysisCTA`, `AnalysisCTAContent`.                                                                                    | `model/`, `api/`, `lib/` |

Consumers import the slice **only** through its public API barrel
([`index.ts`](./index.ts)) — never reach into segment files directly.

## The invariant (enforced)

> `model/` and `lib/` import no React, Next, map, app store, or HTTP; `api/` never imports `ui/`;
> dependencies only point down. (`model/` may use `zustand` for stores.)

Enforced by [`tests/architecture`](../../../tests/architecture) (dependency-cruiser via vitest), run
in the normal suite in CI and locally. See
[ADR 0010](../../../docs/architecture/decisions/0010-c4-adrs-and-a-fitness-function.md).
