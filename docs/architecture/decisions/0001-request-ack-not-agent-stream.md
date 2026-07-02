# ADR 0001: Boundary analysis uses request/acknowledge, not the agent stream

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

Selecting a GADM boundary must trigger statistical analysis. An existing path already connects the stream endpoint to an agent that uses skills to produce analysis.

## Decision

This feature uses a dedicated request/acknowledge flow, independent of the agent stream.

## Why

- The agent path fuses _computing statistics_ with _conversing_; this feature only wants the former.
- Users already accept that analysis takes time, so we don't owe them a synchronous answer — request/ack matches the real latency.
- A first-class analysis protocol can be cached, deduplicated, and observed on its own terms.

## Trade-off accepted

Two result-acquisition paths now exist. We converge them at presentation ([0008](0008-converge-at-insightwidget.md)), never at transport.
