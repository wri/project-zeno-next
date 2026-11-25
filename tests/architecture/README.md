# tests/architecture

The architecture **fitness function** — see [ADR 0010](../../docs/architecture/decisions/0010-c4-adrs-and-a-fitness-function.md). A test _of the structure_, not of a module, which is why it lives here rather than colocated.

- `dependency-cruiser.config.ts` — the rule factories: segment direction per slice (`forbiddenFor`, `forbiddenForEntity`), layer direction (`forbiddenLayerDirection`) and same-layer imports (`forbiddenSameLayer`).
- `fsd-check.ts` — the one shared helper: runs `cruise()`, finds cycles, and matches violations against the allow-list.
- `fsd-allowlist.ts` — data only: today's violations, each tagged with the migration ticket that removes it (`TODO(fsd)`). Tests fail on new violations _and_ on stale entries, so it only shrinks. See [ADR 0012](../../docs/architecture/decisions/0012-fsd-layer-and-same-layer-rules.md).
- `architecture.test.ts` — per-slice segment rules for every slice in features, entities, widgets and pages, plus a source scan for global `fetch`/`XMLHttpRequest` (which the import graph can't see).
- `layers.test.ts`, `same-layer.test.ts`, `cycles.test.ts` — layer direction, same-layer imports and import cycles (slice-level and file-level). Each test file runs on its own and imports no other test.

Run with `pnpm test:arch` (also runs in CI).

Segment direction within the slice, imports point "down": `model → ∅` (pure core: types, ports, orchestrator, store); `lib → model`; `api → model + lib`; `ui → model + api + lib` (and `api` never imports `ui`). `model` and `lib` import no React/router/map/HTTP/app-store (`zustand` is allowed in `model` for stores). Across slices, import only through the public API (`index.ts`); across layers, the FSD order holds: `shared < entities < features < widgets < pages < app` (a lower layer never imports a higher one).

Same-layer rule: slices on one layer import each other only through the target's `index.ts` (entities: its `@x/<consumer>.ts`). `src/shared` is one unit; its files may import each other.

**To see it fail:** add `import { useState } from "react"` (or an `@/app/store/*` import) to any file under `model/`, or make a feature import `src/widgets/...`, and run `pnpm test:arch`.

**Maintainer gotchas:** `cruise()` ignores the ruleSet unless `validate: true` (set in the config), and serializes its result to a JSON string (the test parses it back).
