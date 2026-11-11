import { z } from "zod";

import {
  CHECKLIST_ITEM_IDS,
  EMPTY_PROGRESS,
  type OnboardingProgress,
} from "../model/onboarding-progress";

/** Bump the version to re-show the first-run tour to everyone. */
export const ONBOARDING_STORAGE_KEY = "gnw-onboarding-v1";

/** The subset of `Storage` we use, so tests can pass a plain object. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const progressSchema = z.object({
  tourOutcome: z.enum(["completed", "skipped"]).nullable(),
  checklistDone: z.array(z.enum(CHECKLIST_ITEM_IDS)),
  checklistDismissed: z.boolean(),
});

/**
 * Read stored progress. Anything missing, malformed or unreadable (private
 * mode, blocked storage) falls back to "never onboarded" rather than throwing.
 */
export function readProgress(storage: KeyValueStorage): OnboardingProgress {
  try {
    const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = progressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_PROGRESS;
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
    storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Quota exceeded or storage blocked — the tour simply shows again.
  }
}
