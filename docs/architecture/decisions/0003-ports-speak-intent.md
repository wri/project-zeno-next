# ADR 0003: Ports speak protocol intent; the adapter is the anti-corruption layer

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

The backend interaction is REST — status codes, `Retry-After`, conditional requests — a vocabulary that easily smears across the codebase.

## Decision

The core depends on a port expressed in domain terms (submit / poll / fetch result). One adapter translates intent to HTTP and is the only place that knows status codes and headers.

## Why

- The domain reasons about _submitting_ and _polling an analysis_, not about 202s — keeping it stable and readable.
- HTTP concerns are isolated, so they change and get tested without touching the core.
- Swapping the adapter for a fake in tests needs no core changes.

## Trade-off accepted

An interface indirection over a direct call. That indirection _is_ the protective seam.
