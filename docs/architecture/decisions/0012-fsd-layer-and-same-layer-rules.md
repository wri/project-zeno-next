# ADR 0012: The architecture test guards every FSD layer, with a shrinking allow-list

- **Status:** Accepted
- **Date:** 2026-11-25
- **Ticket:** PZB-1699 (step 0 of the FSD migration, epic PZB-1698). Extends [ADR 0010](0010-c4-adrs-and-a-fitness-function.md).

## Context

The fitness function only covered `src/features/*` and `src/entities/*`. Nothing checked `src/shared`, `src/widgets` or `src/pages`, so a feature could import a widget without any failure. Nothing stopped deep imports into another slice, or import cycles. `features/dashboards/hooks` was a segment the rules didn't cover. The migration moves about 300 files into the layers, so the guard has to exist before the first move.

## Decision

The test in `tests/architecture/` enforces these rules on every layer.

**Layer direction** (`shared < entities < features < widgets < pages < app`; a lower layer never imports a higher one):

- `shared` imports nothing above it (entities, features, widgets, pages, `src/app`).
- Entities don't import features, widgets, pages or `src/app`.
- Features don't import widgets, pages or `src/app`.
- Widgets don't import pages or `src/app`; pages don't import `src/app`.

**Segments**: the `hooks` segment is treated like `ui`. `model`, `lib` and `api` may not import it.

**Same-layer rules** (slices on the same layer):

1. An import between slices goes only through the target slice's `index.ts`.
2. No import cycles between slices. Cycles are also forbidden between files, which covers shared and cycles inside a slice.
3. Entities import a sibling entity only through that sibling's `@x/<consumer>.ts` (e.g. `entities/insight/@x/aoi.ts` is what `aoi` may import from `insight`).
4. Features and widgets may import siblings under rules 1 and 2.

`src/shared` is one unit with no slices: its files may import each other, including within a segment, as long as they don't form a cycle.

**Allow-list.** Today's violations live in `tests/architecture/fsd-allowlist.ts`. Each entry names the migration ticket that removes it (`// TODO(fsd) PZB-17xx`). The tests fail on a violation that isn't listed and on a listed entry that no longer fires, so the list can only shrink. PZB-1713 deletes the file.

The rules are out of scope for imports from `src/` into the legacy root `app/` and `components/` trees: those edges are not guarded until PZB-1713.

## Why not strict same-layer isolation

A rule forbidding all imports between slices on one layer is the purest FSD reading. We rejected it for now: it needs 5–7 slot-prop refactors (a parent passing a sibling's component down as a prop), which change component props, and the migration is structural moves only. Rules 1–4 keep slice boundaries explicit and cycle-free without those refactors. Revisit once the migration is done.

## Trade-off accepted

An allow-list is debt written down. It's explicit, ticketed and can only shrink, which beats an unguarded migration. Edits to a listed file's imports may need an allow-list update in the same PR.
