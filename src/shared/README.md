# src/shared

FSD **shared** layer — reusable, business-agnostic building blocks usable by every layer above.

- `lib/feature-flags/` — hidden-feature gate (`isFeatureEnabled`, `useFeatureFlag`); opt in via the
  `?ff=` URL param, e.g. `?ff=analysis`. Import from `@/src/shared/lib/feature-flags`.
- `lib/units/` — `mgToMt`, converting the LGMS backend's megagram (metric ton) flux fields to the
  megatonnes the curated charts display. Import from `@/src/shared/lib/units`.
- `lib/chart-ticks/` — `niceStep`, `niceTicks`, `formatTick`, round-number y-axis ticks for the
  curated LGMS charts. Import from `@/src/shared/lib/chart-ticks`.
- `lib/number-format/` — `signed`, the design's always-signed, two-significant-digit number format shared
  by the net-flux and flux-tree charts. Import from `@/src/shared/lib/number-format`.
- `ui/Pill.tsx` — the DETAIL/MEASURE dropdown pill shared by the net-flux and flux-tree curated
  charts. Import from `@/src/shared/ui/Pill`.
- `ui/InfoTooltip.tsx` — the info icon + dark tooltip used by the curated chart titles and the
  pills, with `InfoTitle` / `InfoDefinition` for laying out its body. Import from
  `@/src/shared/ui/InfoTooltip`.
- `ui/MeasureInfo.tsx` — the Gross/Net MEASURE tooltip copy shared by the net-flux and flux-tree
  pills. Import from `@/src/shared/ui/MeasureInfo`.
