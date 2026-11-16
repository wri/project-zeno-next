/**
 * What the checklist's header button and panel say, as pure functions of the
 * tasks and the ticks.
 */
import type {
  ChecklistItemId,
  ChecklistTickedBy,
  OnboardingProgress,
} from "../model/onboarding-progress";

export interface ChecklistSummary {
  readonly doneCount: number;
  readonly total: number;
  readonly allDone: boolean;
  /** The share of tasks done, 0 to 1, for the ring and the bar. */
  readonly ratio: number;
  /** The count on the button: "2/6". */
  readonly count: string;
  /** The progress line in the panel: "2 of 6 tasks done", "All tasks done". */
  readonly status: string;
  /** The button's accessible name: "Get started: 2 of 6 tasks done". */
  readonly buttonLabel: string;
}

/**
 * Progress over `items` (in their order). A stored tick for a task that is
 * not listed does not count.
 */
export function checklistSummary(
  items: readonly { readonly id: ChecklistItemId }[],
  done: readonly ChecklistItemId[],
  name: string
): ChecklistSummary {
  const ticked = new Set(done);
  const doneCount = items.filter((item) => ticked.has(item.id)).length;
  const total = items.length;
  const allDone = total > 0 && doneCount === total;
  const counted = `${doneCount} of ${total} tasks done`;
  return {
    doneCount,
    total,
    allDone,
    ratio: total > 0 ? doneCount / total : 0,
    count: `${doneCount}/${total}`,
    status: allDone ? "All tasks done" : counted,
    buttonLabel: `${name}: ${allDone ? "all tasks done" : counted}`,
  };
}

export interface ChecklistRow<T> {
  readonly item: T;
  readonly done: boolean;
  /** Show me starts the task's guide: open tasks only. */
  readonly canShowMe: boolean;
  /** The user ticks it: an open task the app can't see being done. */
  readonly canMarkDone: boolean;
}

/** One row per task, in the tasks' order. */
export function checklistRows<
  T extends {
    readonly id: ChecklistItemId;
    readonly completion: ChecklistTickedBy;
  },
>(items: readonly T[], done: readonly ChecklistItemId[]): ChecklistRow<T>[] {
  const ticked = new Set(done);
  return items.map((item) => {
    const isDone = ticked.has(item.id);
    return {
      item,
      done: isDone,
      canShowMe: !isDone,
      canMarkDone: !isDone && item.completion === "manual",
    };
  });
}

/** The store fields a tick announcement reads. */
export interface TickState {
  readonly hydrated: boolean;
  readonly progress: OnboardingProgress;
}

/**
 * What the live region says when tasks get ticked, or null. Loading stored
 * progress is not a tick. Nothing is said while the checklist is not
 * offered: before the first-run tour has an outcome, or once the user hid it.
 */
export function tickAnnouncement(
  prev: TickState,
  next: TickState,
  labelOf: (id: ChecklistItemId) => string,
  total: number
): string | null {
  const {
    checklistDone: done,
    tourOutcome,
    checklistDismissed,
  } = next.progress;
  if (!prev.hydrated || tourOutcome === null || checklistDismissed) return null;
  const before = new Set(prev.progress.checklistDone);
  const ticked = done.filter((id) => !before.has(id));
  if (ticked.length === 0) return null;
  const what = ticked.length === 1 ? "Task done" : "Tasks done";
  const count =
    done.length >= total
      ? "All tasks done."
      : `${done.length} of ${total} tasks done.`;
  return `${what}: ${ticked.map(labelOf).join(", ")}. ${count}`;
}
