/**
 * What the checklist's header button and panel say, as pure functions of the
 * tasks and the ticks.
 */
import type { ChecklistItemId } from "../model/onboarding-progress";

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
