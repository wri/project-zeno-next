# src/shared

FSD **shared** layer — reusable, business-agnostic building blocks usable by every layer above.

- `lib/feature-flags/` — hidden-feature gate (`isFeatureEnabled`, `useFeatureFlag`); opt in via the
  `?ff=` URL param, e.g. `?ff=analysis`. Import from `@/src/shared/lib/feature-flags`.
- `lib/units/` — `mgToMt`, converting the LGMS backend's megagram (metric ton) flux fields to the
  megatonnes the curated charts display. Import from `@/src/shared/lib/units`.
