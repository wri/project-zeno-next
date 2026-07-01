# ADR 0003: Ports speak protocol intent; the adapter is the anti-corruption layer

- **Status:** Accepted
- **Date:** 2026-06-05
- **Updated:** 2026-06-24 — re-expressed for Feature-Sliced Design (the port is a `model` contract; the adapter lives in the `api` segment). The decision is unchanged.

## Context

The backend interaction is REST — status codes, `Retry-After`, conditional requests — a vocabulary that easily smears across the codebase.

## Decision

The core (`model`) depends on a port expressed in domain terms (submit / poll / fetch result). One adapter in the `api` segment translates intent to HTTP and is the only place that knows status codes and headers.

## Why

- The domain reasons about _submitting_ and _polling an analysis_, not about 202s — keeping it stable and readable.
- HTTP concerns are isolated, so they change and get tested without touching the core.
- Swapping the adapter for a fake in tests needs no core changes.

## Trade-off accepted

An interface indirection over a direct call. That indirection _is_ the protective seam.
