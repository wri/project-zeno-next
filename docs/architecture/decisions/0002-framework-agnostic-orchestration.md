# ADR 0002: Orchestration lives in a framework-agnostic application service

- **Status:** Accepted
- **Date:** 2026-06-05
- **Updated:** 2026-06-24 — re-expressed for Feature-Sliced Design (the service lives in the slice's `model` segment; the hook in `ui`). The decision is unchanged.

## Context

The long-running flow adds polling, cancellation, and timing — stateful logic that easily leaks into React effects, next to a map click handler that is already overloaded.

## Decision

The lifecycle is a plain TypeScript service driving an explicit state machine, living in the feature's `model` segment (framework-free). A thin React hook in the `ui` segment binds it to the UI.

## Why

- The risky logic becomes unit-testable with no map, network, or React in the test.
- Keeping control flow out of effects prevents a second tangle like the existing handler.
- A small, pure core is the most legible thing for a two-person team — and for AI agents — to reason about.

## Trade-off accepted

One extra layer over "just a hook." We pay that for testability and clarity.
