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
 *   hooks  → treated exactly like ui       (used by features/dashboards/hooks)
 *
 * Layer order (a lower layer never imports a higher one; see `forbiddenLayerDirection`):
 *   shared < entities < features < widgets < pages < app
 * Same-layer rules (see `forbiddenSameLayer`, ADR 0012): slices of one layer import each
 * other only through the target's `index.ts` (entities: its `@x/<consumer>.ts`).
 * `src/shared` is one unit — its files may import each other.
 *
 * Limitation: dependency-cruiser sees the import graph, not global calls. The
 * `fetch()` / `XMLHttpRequest` guard lives as a source scan in the test file.
 */

// Frameworks the pure core (model/lib) must not touch. `zustand` is
// intentionally NOT listed — a state library is acceptable in `model` (stores).
const FORBIDDEN_PKGS_CORE =
  "node_modules/(react|react-dom|react-router|maplibre-gl|react-map-gl|terra-draw|" +
  "@chakra-ui|@ark-ui|@tanstack|framer-motion|motion)(/|$)";

/** Layers that hold slices (shared has none). */
export const SLICE_LAYERS = [
  "entities",
  "features",
  "widgets",
  "pages",
] as const;

/** Name of the same-layer rule (non-entity layers); allow-list entries cite it. */
export const SAME_LAYER_RULE = "same-layer-import-via-index";

// Higher FSD layers an entity (a low layer) must never import "up" into.
const HIGHER_LAYERS = [
  "^src/features",
  "^src/widgets",
  "^src/pages",
  "^src/app",
];

/** FSD dependency-direction rules for one slice, e.g. "src/features/analysis". */
export function forbiddenFor(featureDir: string) {
  const feature = `^${featureDir}`;
  return [
    {
      name: "model-is-core",
      comment:
        "FSD: model is the pure core — no ui/api/lib, no React/router/map, no app store.",
      severity: "error",
      from: { path: `${feature}/model` },
      to: {
        path: [
          `${feature}/(ui|hooks|api|lib)`,
          FORBIDDEN_PKGS_CORE,
          "^src/shared/lib/router",
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
          `${feature}/(ui|hooks|api)`,
          FORBIDDEN_PKGS_CORE,
          "^src/shared/lib/router",
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
      to: { path: `${feature}/(ui|hooks)` },
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

/**
 * FSD rules for an entity slice: the same segment-direction rules as any slice,
 * plus a ban on importing "up" into higher layers (features/widgets/pages).
 * An entity sits below features, so it may be used by them but never use them.
 */
export function forbiddenForEntity(entityDir: string) {
  const entity = `^${entityDir}`;
  return [
    ...forbiddenFor(entityDir),
    {
      name: "entity-imports-no-higher-layer",
      comment:
        "FSD: an entity is a low layer — it must not import features/widgets/pages.",
      severity: "error",
      from: { path: `${entity}/(model|lib|api|ui|hooks)` },
      to: { path: HIGHER_LAYERS },
    },
  ];
}

/**
 * Layer-direction rules for the layers `forbiddenForEntity` doesn't cover
 * (entities-not-up is already there). Run on the whole `src` tree, so they
 * apply even before a layer has any slice.
 */
export function forbiddenLayerDirection() {
  const rule = (name: string, from: string, above: string) => ({
    name,
    comment: `FSD: ${from} is below ${above} and must not import it.`,
    severity: "error",
    from: { path: `^src/${from}/` },
    to: { path: `^src/(${above})/` },
  });
  return [
    rule(
      "shared-imports-nothing-above",
      "shared",
      "entities|features|widgets|pages|app"
    ),
    rule("features-import-no-higher-layer", "features", "widgets|pages|app"),
    rule("widgets-import-no-higher-layer", "widgets", "pages|app"),
    rule("pages-import-no-app", "pages", "app"),
  ];
}

/**
 * Same-layer rules for one layer root (e.g. "src/features"):
 *   - A slice imports a sibling slice only through the target's `index.ts`.
 *   - (entities) a sibling entity is imported only through the target's
 *      `@x/<consumer>.ts`, where <consumer> is the importing entity.
 * Uses dependency-cruiser group matching: `$1` is the importing slice.
 * `src/shared` has no slices and is not covered.
 */
export function forbiddenSameLayer(layerDir: string) {
  const layer = layerDir.replace(/^src\//, "");
  const root = `^src/${layer}`;
  const isEntities = layer === "entities";
  return [
    {
      name: isEntities ? "entity-sibling-only-via-x" : SAME_LAYER_RULE,
      comment: isEntities
        ? "FSD: an entity imports a sibling only through that sibling's @x/<consumer>.ts."
        : "FSD: a slice imports a sibling slice only through its index.ts.",
      severity: "error",
      from: { path: `${root}/([^/]+)/` },
      to: {
        path: `${root}/[^/]+/`,
        pathNot: [
          `${root}/$1/`,
          isEntities
            ? `${root}/[^/]+/@x/$1\\.tsx?$`
            : `${root}/[^/]+/index\\.tsx?$`,
        ],
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
