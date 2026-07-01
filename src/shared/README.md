# src/shared

FSD **shared** layer — reusable, business-agnostic building blocks usable by every layer above.

- `lib/feature-flags/` — hidden-feature gate (`isFeatureEnabled`, `useFeatureFlag`); opt in via the
  `?ff=` URL param, e.g. `?ff=analysis`. Import from `@/src/shared/lib/feature-flags`.
