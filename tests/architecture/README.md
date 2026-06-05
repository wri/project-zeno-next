# tests/architecture

The architecture **fitness function** — see [ADR 0010](../../docs/architecture/decisions/0010-c4-adrs-and-a-fitness-function.md). A test _of the structure_, not of a module, which is why it lives here rather than colocated.

- `dependency-cruiser.config.ts` — the ring rules.
- `architecture.test.ts` — runs them via dependency-cruiser's `cruise()` API, plus a source scan for global `fetch`/`XMLHttpRequest` (which the import graph can't see).

Run with `pnpm test:arch` (also runs in CI).

Rings, inward only: `domain → ∅`; `application → domain`; `adapters → domain+application` (never `ui`); `ui → domain+application+adapters`.

**To see it fail:** add `import { useState } from "react"` (or an `@/app/store/*` import) to any file under `domain/` and run `pnpm test:arch`.

**Maintainer gotchas:** `cruise()` ignores the ruleSet unless `validate: true` (set in the config), and serializes its result to a JSON string (the test parses it back).
