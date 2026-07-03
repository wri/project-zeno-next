# ADR 0009: Insight deduplication is deferred

- **Status:** Deferred
- **Date:** 2026-06-05

## Context

With short-circuited results ([0006](0006-submit-short-circuits-to-result.md)), re-analyzing the same boundary could add a duplicate card to the workspace, which accumulates insights.

## Decision

For now, each analyze action appends an insight; we do not deduplicate by analysis identity.

## Why

- Deduplication touches identity semantics at the presentation layer and isn't needed to ship the core flow.
- Appending is predictable and unsurprising in the near term.
- Deferring keeps the first iteration small; the identity fields needed to dedup later already ride on the result.

## Trade-off accepted

Repeated analyses of the same area stack duplicate cards until we revisit this.
