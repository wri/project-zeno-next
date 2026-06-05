# ADR 0008: Converge at the InsightWidget view model

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

Analysis results must appear in the existing insight workspace, which renders `InsightWidget`s from a neutral insight store. The chat/agent path already feeds that same store.

## Decision

The analysis path maps its result to the shared `InsightWidget` view model and adds it to the insight store. It does **not** impersonate the agent's stream envelope to reuse that pipeline.

## Why

- Divergent acquisition, convergent presentation: two very different backends should meet at the view model, not the transport.
- Converging at the envelope would re-couple the clean analysis path to the agent stream we deliberately avoided ([0001](0001-request-ack-not-agent-stream.md)).
- The renderer is already decoupled, so reuse costs almost nothing.

## Trade-off accepted

One mapping function per source instead of one shared. That duplication is healthier than coupling the paths' transports.
