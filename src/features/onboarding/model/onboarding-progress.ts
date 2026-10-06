/**
 * What we remember about a user's onboarding between visits. Kept tiny and
 * versioned so a future tour can re-show itself by bumping the storage key.
 */

export type TourOutcome = "completed" | "skipped";

/** Checklist item ids; the checklist shows them in this order. */
export const CHECKLIST_ITEM_IDS = [
  "ask",
  "data",
  "area",
  "insight",
  "imagery",
  "dashboard",
] as const;

export type ChecklistItemId = (typeof CHECKLIST_ITEM_IDS)[number];

export interface OnboardingProgress {
  /** Outcome of the first-run tour; null until it has run once. */
  readonly tourOutcome: TourOutcome | null;
  readonly checklistDone: readonly ChecklistItemId[];
  /** The user closed the checklist for good. */
  readonly checklistDismissed: boolean;
}

export const EMPTY_PROGRESS: OnboardingProgress = {
  tourOutcome: null,
  checklistDone: [],
  checklistDismissed: false,
};

/** Items the first-run tour teaches, ticked off when it completes. */
export const ITEMS_COVERED_BY_FIRST_RUN_TOUR: readonly ChecklistItemId[] = [
  "ask",
  "data",
  "area",
  "insight",
];
