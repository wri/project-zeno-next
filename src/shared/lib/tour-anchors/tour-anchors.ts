/**
 * `data-tour` anchor ids: named DOM targets for guided tours. Components
 * spread `tourAnchor(TOUR_ANCHORS.x)` onto the element a tour may spotlight;
 * the onboarding feature refers to the same ids. Lives in `shared` so
 * components mark targets without depending on the feature that uses them.
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

export const catalogCardAnchor = (datasetId: number) =>
  `catalog-card-${datasetId}`;

export const boundaryCardAnchor = (layerId: string) =>
  `boundary-card-${layerId}`;

/** Props to mark an element as a tour target. */
export const tourAnchor = (id: string) => ({ "data-tour": id });

/** CSS selector for the elements marked with `tourAnchor(id)`. */
export const tourAnchorSelector = (id: string) => `[data-tour="${id}"]`;
