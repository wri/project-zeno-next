# analysis/domain

Innermost ring — pure business types and rules. No framework, no I/O. **Guarded** by the [architecture fitness function](../../../../tests/architecture).

Lives here: the value objects (`AreaSelection`, `AnalysisRequest`, `AnalysisResult`, the lifecycle states) and `RequestKey` (param normalization → content hash).

Depends on **nothing** — not even `application/`. Reach for React, a store, `fetch`, or an adapter and the fitness test fails. ([ADR 0002](../../../../docs/architecture/decisions/0002-framework-agnostic-orchestration.md))
