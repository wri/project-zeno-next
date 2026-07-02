# ADR 0004: Two identities — client request-key vs server result-identity

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

Whether two analyses are "the same" depends on parameters (known to the client) _and_ on algorithm/dataset versions (known only to the backend).

## Decision

The client computes a request identity from normalized parameters (an idempotency key). The server owns result identity — which folds in version knowledge — and exposes it as a stable resource.

## Why

- The version axis is a backend concern; letting the client author result identity would leak it across the context boundary.
- One clean split yields idempotent submits, deduplication, and a cache key — instead of three separate mechanisms.
- It keeps the client honest: it asks; the server decides sameness and freshness.

## Trade-off accepted

Sameness is only as good as parameter normalization. That normalization is real domain work, and lives in the testable core.
