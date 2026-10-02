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
- `lib/flux-tooltip/` — the hover-tooltip model (`FluxTooltipRow`/`Total`/`Model`, `NET_FLUX_TOTAL_LABEL`)
  the net-flux and flux-tree chart models build for `ui/FluxTooltip`. Import from
  `@/src/shared/lib/flux-tooltip`.
- `lib/paint/` — `isPaintReference`, true for an SVG `url(#…)` paint reference as opposed to a CSS colour.
  Import from `@/src/shared/lib/paint`.
- `ui/Pill.tsx` — the DETAIL/MEASURE dropdown pill shared by the net-flux and flux-tree curated
  charts. Import from `@/src/shared/ui/Pill`.
- `ui/InfoTooltip.tsx` — the info icon + dark tooltip used by the curated chart titles and the
  pills, with `InfoTitle` / `InfoDefinition` for laying out its body. Import from
  `@/src/shared/ui/InfoTooltip`.
- `ui/MeasureInfo.tsx` — the Gross/Net MEASURE tooltip copy shared by the net-flux and flux-tree
  pills. Import from `@/src/shared/ui/MeasureInfo`.
- `ui/FluxTooltip.tsx` — the dark hover-tooltip panel (heading, swatched rows, bold net total) shared
  by the net-flux and flux-tree charts; each chart supplies a `lib/flux-tooltip` model. Import from
  `@/src/shared/ui/FluxTooltip`.
- `ui/Swatch.tsx` — the legend/tooltip colour swatch shared by the net-flux and flux-tree charts; renders
  SVG hatch-pattern fills too. Import from `@/src/shared/ui/Swatch`.
