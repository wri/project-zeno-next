# features/analysis

Boundary-analysis feature. See [docs/architecture](../../../docs/architecture/README.md) for the design and the _why_.

## Layout (hexagonal rings, dependencies point inward)

| Folder         | Role                                                                                       | May depend on                          |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| `domain/`      | Innermost: value objects, `RequestKey`. Pure.                                              | nothing                                |
| `application/` | `AnalysisService` (LRO state machine), the ports.                                          | `domain/`                              |
| `adapters/`    | Driven adapters implementing ports: `RestAnalysisGateway`, `SystemClock`, `FaroTelemetry`. | `domain/`, `application/`              |
| `ui/`          | Driving side: `useAnalysis` (composition root), `AnalysisCTA`, `selectionStore`.           | `domain/`, `application/`, `adapters/` |

## The invariant (enforced)

> `domain/` and `application/` import no React, Next, map, app store, or HTTP — and dependencies only point inward.

Enforced by [`tests/architecture`](../../../tests/architecture) (dependency-cruiser via vitest), run by `pnpm test:arch` in CI and locally — not by eslint. See [ADR 0010](../../../docs/architecture/decisions/0010-c4-adrs-and-a-fitness-function.md).
