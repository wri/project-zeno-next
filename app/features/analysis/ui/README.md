# analysis/ui

Driving adapters — the React edge that starts the domain/application and renders its state.

- `useAnalysis` — hook that constructs `AnalysisService` (injecting the adapters), exposes lifecycle state, cancels on unmount and on re-run via `AbortController`, and wires the result to the insight surface. Exposes a `cancel()` function that aborts the in-flight analysis and resets status to `"idle"`.
- `AnalysisCTA` — geo-anchored `react-map-gl` popup; persists until the analysis is terminal or the user cancels ([ADR 0007](../../../../docs/architecture/decisions/0007-selection-is-ephemeral-ui-state.md)).
- `selectionStore` — ephemeral `{ selection, lngLat }`, distinct from chat context.
