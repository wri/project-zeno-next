# Boundary Analysis — Architecture

How a click on a **GADM political boundary** becomes a long-running analysis whose result lands in the insight workspace.

> **The flow, in one breath:** select a boundary → a geo-anchored CTA offers _Analyze_ → a framework-free service submits the request and polls until done → the result is mapped to the shared `InsightWidget` view model and rendered in the existing workspace.

This folder is the source of truth for that design, kept in-repo so both the team and AI agents can read it next to the code ([ADR 0010](decisions/0010-c4-adrs-and-a-fitness-function.md)).

## The one invariant

> **The core (domain + application) never imports React, Next, or HTTP.** Adapters depend on the core's ports — never the reverse.

This is enforced as a build-time fitness function, not a guideline. If you only remember one thing, remember this.

## Diagrams

Rendered Mermaid sources (`.mermaid`):

| File                                                                         | Shows                                                                                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [diagrams/c4-component.mermaid](diagrams/c4-component.mermaid)               | The components and how they wire together — driving adapters, the framework-free core, driven adapters, and the shared presentation surface. |
| [diagrams/class-hexagonal.mermaid](diagrams/class-hexagonal.mermaid)         | The hexagonal structure — ports as interfaces, the service depending only on them, adapters realizing them.                                  |
| [diagrams/sequence-happy-path.mermaid](diagrams/sequence-happy-path.mermaid) | The happy path end to end: select → submit → poll → result → widgets → workspace.                                                            |

## Decisions (the _why_)

Read top to bottom for the narrative; each is one screen.

| ADR                                                                 | Decision                               | Why it matters                                                                         |
| ------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| [0001](decisions/0001-request-ack-not-agent-stream.md)              | Request/ack, not the agent stream      | Compute statistics without fusing in conversation; own caching/dedup/observability.    |
| [0002](decisions/0002-framework-agnostic-orchestration.md)          | Framework-agnostic orchestration       | The risky lifecycle logic becomes testable without map, network, or React.             |
| [0003](decisions/0003-ports-speak-intent.md)                        | Ports speak intent; adapter is the ACL | The domain talks domain; HTTP stays isolated and swappable.                            |
| [0004](decisions/0004-two-identities.md)                            | Two identities: request vs result      | Version knowledge stays server-side; one split gives idempotency + caching.            |
| [0005](decisions/0005-caching-is-server-authored-infrastructure.md) | Caching is server-authored infra       | A shared edge cache, not per-device caches, wins for popular boundaries on weak links. |
| [0006](decisions/0006-submit-short-circuits-to-result.md)           | Submit short-circuits to a result      | Skip the whole poll loop when an answer already exists.                                |
| [0007](decisions/0007-selection-is-ephemeral-ui-state.md)           | Selection is ephemeral UI state        | Don't couple analysis selection to chat context through a shared store.                |
| [0008](decisions/0008-converge-at-insightwidget.md)                 | Converge at the view model             | Two backends meet at `InsightWidget`, never at the transport.                          |
| [0009](decisions/0009-insight-dedup-deferred.md)                    | Insight dedup deferred                 | Append for now; identity-based dedup is a later, optional refinement.                  |
| [0010](decisions/0010-c4-adrs-and-a-fitness-function.md)            | C4 + ADRs + fitness function           | Communicable, agent-readable, and enforced — not just documented.                      |

## Status

Design accepted; not yet implemented. Known deferrals: insight deduplication ([0009](decisions/0009-insight-dedup-deferred.md)); telemetry adapter (`TelemetrySink` → Grafana Faro) is planned and appears dashed/"planned" in the diagrams.

## Glossary

- **AreaSelection** — value object produced from a map click; the AOI identity + anchor.
- **Request key** — content hash of normalized parameters; the client's idempotency key.
- **Result identity** — server-owned, version-aware identity of a result, exposed as a stable cacheable URL.
- **LRO** — long-running operation: submit → poll (honoring `Retry-After`) → terminal.
- **Convergence** — the point where the analysis and chat paths meet: `insightStore.addInsights()`.
