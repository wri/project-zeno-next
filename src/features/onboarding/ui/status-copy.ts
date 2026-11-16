/**
 * The words of the popover's status bar, and of the note that the tour
 * skipped a step. Pure: the overlay passes in what it knows, the tests call
 * the same functions.
 */
import { sentence } from "../lib/tour-announcement";
import type { PassedOverStep } from "../model/onboarding-store";
import {
  stepKind,
  stepStatusTone,
  type StepStatusFacts,
  type StepStatusTone,
} from "../model/step-policy";
import type { TourStep } from "../model/tour";
import type { StatusLine } from "./StepStatusBar";
import { NEXT_LABEL, SKIP_STEP_LABEL } from "./TourPopover";
import { uiLabelText } from "./ui-label";

export const SLOW_WAIT_STATUS = `This is taking a long time. You can wait, or click ${SKIP_STEP_LABEL}.`;
export const DONE_MOVING_ON_STATUS = "Done. The next step opens soon.";
// Functions, not constants: the assistant's name follows the UI locale.
export const failedStatus = () =>
  `The ${uiLabelText("chat.header.title")} could not finish this answer. The chat shows what went wrong.`;
export const askedStatus = () =>
  `The ${uiLabelText("chat.header.title")} has a question for you.`;

interface StatusCopyInput {
  readonly tone: StepStatusTone;
  readonly awaitingAction: boolean;
  readonly hint?: string;
  readonly readyHint?: string;
  readonly blockedNote?: string;
}

function statusCopy(input: StatusCopyInput): string {
  const { tone, awaitingAction, hint, readyHint, blockedNote } = input;
  switch (tone) {
    case "turn":
      return `Your turn. ${sentence(hint ?? "Use the highlighted control")}`;
    case "wait":
      return sentence(hint ?? "Waiting");
    case "slow":
      return SLOW_WAIT_STATUS;
    case "done":
      // Still waiting means the step moves on by itself; else it shows Next.
      return awaitingAction
        ? DONE_MOVING_ON_STATUS
        : sentence(readyHint ?? `Done. Click ${NEXT_LABEL}`);
    case "failed":
      return failedStatus();
    case "asked":
      return askedStatus();
    case "blocked":
      if (blockedNote === undefined)
        throw new Error("A step with `blockedIf` needs a `blockedNote`.");
      return blockedNote;
  }
}

/**
 * What the step's status bar shows, from what the overlay knows about it
 * now; null when there is nothing to say (an info step).
 */
export function stepStatus(
  step: TourStep<unknown>,
  facts: Omit<StepStatusFacts, "kind">
): StatusLine | null {
  const kind = stepKind(step);
  const tone = stepStatusTone({ ...facts, kind });
  if (tone === null) return null;
  return {
    tone,
    text: statusCopy({
      tone,
      awaitingAction: facts.awaitingAction,
      hint: step.hint,
      readyHint: step.readyHint,
      blockedNote: step.blockedNote,
    }),
  };
}

/**
 * What the step after an automatic skip says: how many steps the tour
 * passed over by itself, and why (the first step that gave a reason, which
 * is usually what made the others go too). Null when none was.
 */
export function skippedNotice(
  passedOver: readonly Pick<PassedOverStep, "note">[]
): string | null {
  if (passedOver.length === 0) return null;
  const head =
    passedOver.length === 1
      ? "We skipped a step."
      : `We skipped ${passedOver.length} steps.`;
  const note = passedOver.find((p) => p.note)?.note;
  return note ? `${head} ${sentence(note)}` : head;
}
