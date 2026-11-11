/**
 * What the tour's live region says. Pure, so the overlay's effects can call
 * it twice (StrictMode) and change nothing the second time.
 */

/** `text` as a sentence: a full stop added unless it already ends in one. */
export function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export interface StepAnnouncementInput {
  readonly stepNumber: number;
  readonly stepCount: number;
  readonly title: string;
  /** The step's status words, if any. */
  readonly status: string | null;
}

/**
 * What the live region says when a step opens: where the user is (not for a
 * one-step guide), the step's title, and its status.
 */
export function stepAnnouncement(input: StepAnnouncementInput): string {
  const { stepNumber, stepCount, title, status } = input;
  return [
    stepCount > 1 ? `Step ${stepNumber} of ${stepCount}.` : null,
    sentence(title),
    status,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The live region's last message, and the step and status it was for. */
export interface Announcement {
  readonly stepKey: string | null;
  readonly status: string | null;
  readonly text: string;
}

export const NO_ANNOUNCEMENT: Announcement = {
  stepKey: null,
  status: null,
  text: "",
};

export interface AnnouncementInput extends StepAnnouncementInput {
  readonly stepKey: string;
  /** Said once, as the step opens (e.g. "We skipped a step."). */
  readonly notice: string | null;
}

/**
 * The live region's next message. A new step: the whole step, with the
 * notice. A new status on the same step: the status only. Nothing new:
 * `prev` itself, so a repeated call changes nothing and says nothing.
 */
export function nextAnnouncement(
  prev: Announcement,
  input: AnnouncementInput
): Announcement {
  const { stepKey, status, notice } = input;
  if (prev.stepKey !== stepKey) {
    const opening = [notice, status].filter(Boolean).join(" ") || null;
    return {
      stepKey,
      status,
      text: stepAnnouncement({ ...input, status: opening }),
    };
  }
  if (prev.status === status) return prev;
  return { stepKey, status, text: status ?? "" };
}
