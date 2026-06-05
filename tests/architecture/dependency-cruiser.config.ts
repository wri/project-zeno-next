/**
 * Architecture fitness function — see ADR 0010 (docs/architecture/decisions).
 *
 * Encodes the hexagonal dependency direction for `features/analysis`. Consumed
 * by `architecture.test.ts` through dependency-cruiser's `cruise()` API, so it
 * runs inside the normal `vitest` suite (and therefore CI) — no separate step.
 *
 * Rings, dependencies pointing inward only:
 *   domain      → (nothing)
 *   application → domain
 *   adapters    → domain, application            (driven; never ui)
 *   ui          → domain, application, adapters   (driving side / composition root)
 *
 * Limitation: dependency-cruiser sees the import graph, not global calls. The
 * `fetch()` / `XMLHttpRequest` guard lives as a source scan in the test file.
 */

const FEATURE = "^app/features/analysis";

// Matches the leaf `node_modules/<pkg>/` even through pnpm's `.pnpm` store.
const FRAMEWORK_PKGS =
  "node_modules/(react|react-dom|next|maplibre-gl|react-map-gl|terra-draw|" +
  "zustand|@chakra-ui|@ark-ui|@tanstack|framer-motion|motion)(/|$)";

export const forbidden = [
  {
    name: "domain-is-innermost",
    comment:
      "ADR 0002: domain is pure — no application, adapters, ui, framework, or app state.",
    severity: "error",
    from: { path: `${FEATURE}/domain` },
    to: {
      path: [
        `${FEATURE}/(application|adapters|ui)`,
        FRAMEWORK_PKGS,
        "^app/store",
        "^app/config/api",
      ],
    },
  },
  {
    name: "application-stays-pure",
    comment:
      "ADR 0002/0003: application orchestrates domain via ports — no framework, adapters, ui, or app state.",
    severity: "error",
    from: { path: `${FEATURE}/application` },
    to: {
      path: [
        `${FEATURE}/(adapters|ui)`,
        FRAMEWORK_PKGS,
        "^app/store",
        "^app/config/api",
      ],
    },
  },
  {
    name: "core-makes-no-http",
    comment:
      "ADR 0003: domain/application reach the backend only through the injected gateway port.",
    severity: "error",
    from: { path: `${FEATURE}/(domain|application)` },
    to: { dependencyTypes: ["core"], path: "^(http|https|http2|net|tls|dns)$" },
  },
  {
    name: "adapters-are-ui-blind",
    comment: "A driven adapter must not know the screen.",
    severity: "error",
    from: { path: `${FEATURE}/adapters` },
    to: { path: `${FEATURE}/ui` },
  },
];

export const options = {
  // Without this, cruise() silently ignores the ruleSet (default is false).
  validate: true,
  doNotFollow: { path: "node_modules" },
  tsConfig: { fileName: "tsconfig.json" },
  enhancedResolveOptions: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
};
