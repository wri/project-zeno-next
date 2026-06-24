# tests/architecture

The architecture **fitness function** — see [ADR 0010](../../docs/architecture/decisions/0010-c4-adrs-and-a-fitness-function.md). A test _of the structure_, not of a module, which is why it lives here rather than colocated.

- `dependency-cruiser.config.ts` — the FSD segment-direction rules for the `analysis` slice.
- `architecture.test.ts` — runs them via dependency-cruiser's `cruise()` API, plus a source scan for global `fetch`/`XMLHttpRequest` (which the import graph can't see).

Run with `pnpm test:arch` (also runs in CI).

Segment direction within the slice, imports point "down": `model → ∅` (pure core: types, ports, orchestrator, store); `lib → model`; `api → model + lib`; `ui → model + api + lib` (and `api` never imports `ui`). `model` and `lib` import no React/Next/map/HTTP/app-store (`zustand` is allowed in `model` for stores). Across slices, import only through the public API (`index.ts`); across layers, the FSD order holds: `shared < entities < features < widgets < pages < app` (a lower layer never imports a higher one).

**To see it fail:** add `import { useState } from "react"` (or an `@/app/store/*` import) to any file under `model/` and run `pnpm test:arch`.

**Maintainer gotchas:** `cruise()` ignores the ruleSet unless `validate: true` (set in the config), and serializes its result to a JSON string (the test parses it back).
