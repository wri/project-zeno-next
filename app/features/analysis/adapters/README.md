# analysis/adapters

Driven adapters that implement the `application/` ports. The only place that knows the backend is REST.

- `RestAnalysisGateway` implements `AnalysisGateway` — translates submit/poll/fetchResult to HTTP (202 + pollUri, `Retry-After`, `303` → result, `If-None-Match`). The anti-corruption layer ([ADR 0003](../../../../docs/architecture/decisions/0003-ports-speak-intent.md)).
- `SystemClock` implements `Clock`.
- `FaroTelemetry` implements `TelemetrySink` _(planned)_.
