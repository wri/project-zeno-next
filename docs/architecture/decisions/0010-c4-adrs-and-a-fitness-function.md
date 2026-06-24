# ADR 0010: Architecture is governed by C4 + ADRs and a dependency-direction fitness function

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

A two-person team wants clean seams that survive change and stay legible to AI agents, without heavyweight formal modeling.

## Decision

Architecture is described with Mermaid C4 and concise ADRs kept in-repo, and protected by a fitness function — a dependency-cruiser check run as a vitest test under `tests/architecture` (so it runs in CI, not as an eslint side-effect). It asserts the hexagonal direction: `domain`/`application` import no framework or HTTP, and dependencies point inward.

## Why

- Plain-text, diffable diagrams and decisions are the most communicable artifacts for a small team and for agents — they live by the code and are reviewed in PRs.
- A clean seam is worthless if nothing enforces it; the dependency check turns "please don't" into a build signal.
- Formal architecture languages would be ceremony this team won't sustain.

## Trade-off accepted

The fitness function must be maintained and can block merges. That friction is the point.
