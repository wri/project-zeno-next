import { checkLabel } from "../model/config";
import type { Question } from "../model/types";

export type StatusFilter = "all" | "failed" | "inconsistent";

export interface QuestionFilter {
  readonly status: StatusFilter;
  /** Query type key, or "" for every type. */
  readonly type: string;
  /** Use case key (e.g. "UC2"), or "" for every use case. */
  readonly useCase: string;
  readonly search: string;
}

export const NO_FILTER: QuestionFilter = {
  status: "all",
  type: "",
  useCase: "",
  search: "",
};

function haystack(q: Question): string {
  const checks = q.failedChecks.map((f) => `${f.check} ${checkLabel(f.check)}`);
  return [q.id, q.query, ...checks].join(" ").toLowerCase();
}

export function filterQuestions(
  questions: readonly Question[],
  filter: QuestionFilter
): Question[] {
  const search = filter.search.trim().toLowerCase();
  return questions.filter((q) => {
    if (
      filter.status === "failed" &&
      q.status !== "fail" &&
      q.status !== "error"
    )
      return false;
    if (filter.status === "inconsistent" && q.status !== "inconsistent")
      return false;
    if (filter.type && q.type !== filter.type) return false;
    if (filter.useCase && !q.useCases.includes(filter.useCase)) return false;
    return !search || haystack(q).includes(search);
  });
}
