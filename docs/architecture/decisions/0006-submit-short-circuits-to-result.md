# ADR 0006: Submit short-circuits to a cached result

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

We control the analysis service, and a popular boundary's result often already exists when the next user asks for it.

## Decision

A submit that matches an existing fresh result is answered by pointing at that result resource rather than starting new work.

## Why

- It spares bandwidth-constrained users the entire polling loop when an answer already exists.
- It directly serves the "popular boundary, many users" reality with no extra client logic.
- It falls out for free because the client already sends a stable request key ([0004](0004-two-identities.md)).

## Trade-off accepted

The submit response isn't uniform (new work vs existing result). The client handles both — the state machine already models it.
