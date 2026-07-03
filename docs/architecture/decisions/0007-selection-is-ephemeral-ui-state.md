# ADR 0007: Map selection is ephemeral UI state, distinct from chat context

- **Status:** Accepted
- **Date:** 2026-06-05

## Context

Clicking a boundary must show a CTA and feed analysis. The existing handler also writes to the chat-context store, which serves the conversational AI flow.

## Decision

Selection is one `AreaSelection` value object held in a dedicated, ephemeral selection store — separate from chat-context and map-registry stores. The CTA renders as a geo-anchored popup.

## Why

- Selecting an area for analysis is not the same concern as building chat context; conflating them couples unrelated features through one store.
- A single selection value object with multiple consumers avoids re-extracting the same data per feature.
- Geo-anchoring matches the existing area tooltip, so the pattern is already familiar.

## Trade-off accepted

Another small store. We accept it to keep concerns from bleeding together.
