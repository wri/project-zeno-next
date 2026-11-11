/**
 * `data-tour` anchor ids: named DOM targets for guided tours. Components
 * spread `tourAnchor(TOUR_ANCHORS.x)` onto the element a tour may spotlight;
 * the onboarding feature refers to the same ids. Lives in `shared` so
 * components mark targets without depending on the feature that uses them.
 *
 * `tests/architecture/tour-contract.test.ts` pins where each anchor is set and
 * checks that every anchor is used by a tour step.
 */
export const TOUR_ANCHORS = {
  chatPanel: "chat-panel",
  chatInput: "chat-input",
  samplePrompts: "sample-prompts",
  datasetsButton: "datasets-button",
  areasButton: "areas-button",
  catalogPanel: "catalog-panel",
  areasPanel: "areas-panel",
  areaTools: "area-tools",
  viewAnalysisNudge: "view-analysis-nudge",
  reasoning: "reasoning",
  chatAreaCard: "chat-area-card",
  chatDatasetCard: "chat-dataset-card",
  chatAnalysisCard: "chat-analysis-card",
  insightWorkspace: "insight-workspace",
  analysesButton: "analyses-button",
  mapLegend: "map-legend",
  basemapButton: "basemap-button",
  menuButton: "menu-button",
} as const;

/**
 * Every id a tour can point at: the fixed anchors, plus one id per catalogue
 * row and per boundary layer. A typo in a step target fails typecheck.
 */
export type TourAnchorId =
  | (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS]
  | `catalog-card-${number}`
  | `boundary-card-${string}`;

export const catalogCardAnchor = (datasetId: number): TourAnchorId =>
  `catalog-card-${datasetId}`;

export const boundaryCardAnchor = (layerId: string): TourAnchorId =>
  `boundary-card-${layerId}`;

/** Props to mark an element as a tour target. */
export const tourAnchor = (id: TourAnchorId) => ({ "data-tour": id });

/** CSS selector for the elements marked with `tourAnchor(id)`. */
export const tourAnchorSelector = (id: TourAnchorId) => `[data-tour="${id}"]`;
