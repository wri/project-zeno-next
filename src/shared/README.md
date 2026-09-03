# src/shared

FSD **shared** layer — reusable, business-agnostic building blocks usable by every layer above.

- `lib/feature-flags/` — hidden-feature gate (`isFeatureEnabled`, `useFeatureFlag`); opt in via the
  `?ff=` URL param, e.g. `?ff=analysis`. Import from `@/src/shared/lib/feature-flags`.
- `lib/units/` — `mgToMt`, converting the LGMS backend's megagram (metric ton) flux fields to the
  megatonnes the curated charts display. Import from `@/src/shared/lib/units`.
- `lib/chart-ticks/` — `niceStep`, `niceTicks`, `formatTick`, round-number y-axis ticks for the
  curated LGMS charts. Import from `@/src/shared/lib/chart-ticks`.
- `lib/number-format/` — `signed`, `signedPlain`, the design's always-signed number format shared
  by the net-flux and flux-tree charts. Import from `@/src/shared/lib/number-format`.
- `ui/Pill.tsx` — the DETAIL/MEASURE dropdown pill shared by the net-flux and flux-tree curated
  charts. Import from `@/src/shared/ui/Pill`.
