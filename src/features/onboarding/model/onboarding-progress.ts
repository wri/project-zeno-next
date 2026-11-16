/**
 * What we remember about a user's onboarding between visits. Kept tiny; a
 * future tour re-shows itself by raising `FIRST_RUN_TOUR_VERSION`.
 */

export type TourOutcome = "completed" | "skipped";

/**
 * The first-run tour version a stored outcome belongs to. Raise it to show
 * the tour again to everyone who finished or skipped an older one; their
 * checklist progress is kept.
 */
export const FIRST_RUN_TOUR_VERSION = 2;

/**
 * Checklist item ids; the checklist shows them in this order. Each is a task
 * the user does in the app, ticked when the app shows it was done. Stored
 * ids that are not listed here are dropped on load, so renaming an item
 * clears its old tick.
 */
export const CHECKLIST_ITEM_IDS = [
  "alerts",
  "protected-area",
  "own-area",
  "compare",
  "dashboard-pdf",
  "satellite-imagery",
] as const;

export type ChecklistItemId = (typeof CHECKLIST_ITEM_IDS)[number];

/** How an item got its tick: from what the app shows, or the user's word. */
export type ChecklistTickedBy = "detected" | "manual";

export interface OnboardingProgress {
  /** Outcome of the first-run tour; null until it has run once. */
  readonly tourOutcome: TourOutcome | null;
  readonly checklistDone: readonly ChecklistItemId[];
  /** The user hid the checklist. Taking the tour again brings it back. */
  readonly checklistDismissed: boolean;
}

export const EMPTY_PROGRESS: OnboardingProgress = {
  tourOutcome: null,
  checklistDone: [],
  checklistDismissed: false,
};
