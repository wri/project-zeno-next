import { z } from "zod";

import {
  CHECKLIST_ITEM_IDS,
  EMPTY_PROGRESS,
  FIRST_RUN_TOUR_VERSION,
  type ChecklistItemId,
  type OnboardingProgress,
} from "../model/onboarding-progress";

/**
 * Fixed: the versions live inside the value. To re-show the first-run tour,
 * raise `FIRST_RUN_TOUR_VERSION` instead, which keeps checklist progress.
 */
export const ONBOARDING_STORAGE_KEY = "gnw-onboarding-v1";

/**
 * Shape of the stored value. Every version is read by the parser below
 * today; a later change to the shape branches on it to migrate.
 */
export const PROGRESS_SCHEMA_VERSION = 1;

/** The subset of `Storage` we use, so tests can pass a plain object. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const isChecklistItemId = (id: unknown): id is ChecklistItemId =>
  (CHECKLIST_ITEM_IDS as readonly unknown[]).includes(id);

/** The first-run tour version of values stored before versions existed. */
const UNVERSIONED_TOUR_VERSION = 1;

// Each field falls back on its own, so one stale or unknown value (e.g. a
// renamed checklist item) doesn't reset everything and re-run the tour.
const storedSchema = z.object({
  tourVersion: z.number().catch(UNVERSIONED_TOUR_VERSION),
  tourOutcome: z.enum(["completed", "skipped"]).nullable().catch(null),
  checklistDone: z
    .array(z.unknown())
    .catch([])
    .transform((ids) => [...new Set(ids.filter(isChecklistItemId))]),
  checklistDismissed: z.boolean().catch(false),
});

/**
 * Read stored progress. Anything missing, malformed or unreadable (private
 * mode, blocked storage) falls back to "never onboarded" rather than throwing.
 * An outcome from an older first-run tour doesn't count, so the new one shows.
 */
export function readProgress(storage: KeyValueStorage): OnboardingProgress {
  try {
    const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return EMPTY_PROGRESS;
    const { tourVersion, ...progress } = parsed.data;
    return tourVersion < FIRST_RUN_TOUR_VERSION
      ? { ...progress, tourOutcome: null }
      : progress;
  } catch {
    return EMPTY_PROGRESS;
  }
}

/** Write progress; storage failures are ignored (onboarding is best-effort). */
export function writeProgress(
  storage: KeyValueStorage,
  progress: OnboardingProgress
): void {
  try {
    storage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        tourVersion: FIRST_RUN_TOUR_VERSION,
        ...progress,
      })
    );
  } catch {
    // Quota exceeded or storage blocked — the tour simply shows again.
  }
}
