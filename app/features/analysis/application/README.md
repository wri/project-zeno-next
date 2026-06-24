# analysis/application

Orchestration ring — coordinates the domain through ports. Framework- and HTTP-free; **guarded**.

Lives here: `AnalysisService` (the LRO state machine) and the port interfaces (`AnalysisGateway`, `Clock`, `TelemetrySink`).

May depend on `domain/`. May **not** depend on `adapters/`, `ui/`, React, app stores, or HTTP — it reaches the outside only through its ports. ([ADR 0002](../../../../docs/architecture/decisions/0002-framework-agnostic-orchestration.md) / [0003](../../../../docs/architecture/decisions/0003-ports-speak-intent.md))
