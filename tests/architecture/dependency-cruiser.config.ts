/**
 * Architecture fitness function — see ADR 0010 (docs/architecture/decisions).
 *
 * Encodes the Feature-Sliced Design (FSD) dependency direction for the slices
 * under `src/features/`. Consumed by `architecture.test.ts` through
 * dependency-cruiser's `cruise()` API, so it runs inside the normal `vitest`
 * suite (and therefore CI) — no separate step.
 *
 * Segment direction (imports point "down" only):
 *   model  → (model only)                  pure core: types, ports, orchestrator, store
 *   lib    → model                         pure helpers / generic impls
 *   api    → model, lib                    backend adapters (HTTP allowed)
 *   ui     → model, api, lib               React edge + composition root
 *
 * Cross-slice imports must go through the slice's public API (`index.ts`).
 *
 * Limitation: dependency-cruiser sees the import graph, not global calls. The
 * `fetch()` / `XMLHttpRequest` guard lives as a source scan in the test file.
 */

// Frameworks the pure core (model/lib) must not touch. `zustand` is
// intentionally NOT listed — a state library is acceptable in `model` (stores).
const FORBIDDEN_PKGS_CORE =
  "node_modules/(react|react-dom|next|maplibre-gl|react-map-gl|terra-draw|" +
  "@chakra-ui|@ark-ui|@tanstack|framer-motion|motion)(/|$)";

/** FSD dependency-direction rules for one slice, e.g. "src/features/analysis". */
export function forbiddenFor(featureDir: string) {
  const feature = `^${featureDir}`;
  return [
    {
      name: "model-is-core",
      comment:
        "FSD: model is the pure core — no ui/api/lib, no React/Next/map, no app store.",
      severity: "error",
      from: { path: `${feature}/model` },
      to: {
        path: [
          `${feature}/(ui|api|lib)`,
          FORBIDDEN_PKGS_CORE,
          "^app/store",
          "^app/config/api",
        ],
      },
    },
    {
      name: "lib-is-pure",
      comment:
        "FSD: lib holds pure helpers — may use model, never ui/api or framework.",
      severity: "error",
      from: { path: `${feature}/lib` },
      to: {
        path: [
          `${feature}/(ui|api)`,
          FORBIDDEN_PKGS_CORE,
          "^app/store",
          "^app/config/api",
        ],
      },
    },
    {
      name: "api-is-ui-blind",
      comment: "A backend adapter must not import the screen (ui).",
      severity: "error",
      from: { path: `${feature}/api` },
      to: { path: `${feature}/ui` },
    },
    {
      name: "core-makes-no-http",
      comment:
        "model/lib reach the backend only through the injected gateway port (implemented in api).",
      severity: "error",
      from: { path: `${feature}/(model|lib)` },
      to: {
        dependencyTypes: ["core"],
        path: "^(http|https|http2|net|tls|dns)$",
      },
    },
  ];
}

export const options = {
  // Without this, cruise() silently ignores the ruleSet (default is false).
  validate: true,
  // The guard is about production dependency direction, not test code.
  exclude: { path: "(/__tests__/|\\.test\\.[tj]sx?$)" },
  doNotFollow: { path: "node_modules" },
  tsConfig: { fileName: "tsconfig.json" },
  enhancedResolveOptions: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
};
