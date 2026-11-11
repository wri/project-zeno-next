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
  datasetsButton: "datasets-button",
  areasPanel: "areas-panel",
  viewAnalysisNudge: "view-analysis-nudge",
  insightWorkspace: "insight-workspace",
  analysesButton: "analyses-button",
} as const;

/**
 * Every id a tour can point at: the fixed anchors, plus one id per catalogue
 * row. A typo in a step target fails typecheck.
 */
export type TourAnchorId =
  | (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS]
  | `catalog-card-${number}`;

export const catalogCardAnchor = (datasetId: number): TourAnchorId =>
  `catalog-card-${datasetId}`;

/** Props to mark an element as a tour target. */
export const tourAnchor = (id: TourAnchorId) => ({ "data-tour": id });

/** CSS selector for the elements marked with `tourAnchor(id)`. */
export const tourAnchorSelector = (id: TourAnchorId) => `[data-tour="${id}"]`;
