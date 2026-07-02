# ADR 0005: Caching is server-authored infrastructure

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

Clients are bandwidth-constrained worldwide, and popular boundaries are analyzed by many users. Offline use is not required.

## Decision

Terminal results are cacheable resources whose freshness the analysis service authors; caching is handled by the CDN edge and the browser HTTP cache. The client keeps no bespoke result cache, and no Service Worker.

## Why

- The biggest win for popular boundaries is a _shared_ edge cache — one regional fetch serves many — not per-device caches.
- Freshness must be decided by the side that knows the versions; a client inventing TTLs would risk serving stale results.
- Platform caching keeps the app simple and avoids hand-rolled invalidation, which a small team can't afford.

## Trade-off accepted

Cache behaviour depends on backend + CDN configuration. We own both, so this is intentional.
