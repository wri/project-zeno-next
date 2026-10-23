import { checkLabel } from "../model/config";
import type { Question } from "../model/types";

/** "inconsistent": right overall, but at least one check failed on a try. */
export type QuestionStatus = "pass" | "inconsistent" | "fail" | "error";

export function questionStatus(q: Question): QuestionStatus {
  if (q.verdict === "error") return "error";
  if (q.verdict === "fail" || q.verdict === "uncovered") return "fail";
  return q.failedChecks.length ? "inconsistent" : "pass";
}

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
    const status = questionStatus(q);
    if (filter.status === "failed" && status !== "fail" && status !== "error")
      return false;
    if (filter.status === "inconsistent" && status !== "inconsistent")
      return false;
    if (filter.type && q.type !== filter.type) return false;
    if (filter.useCase && !q.useCases.includes(filter.useCase)) return false;
    return !search || haystack(q).includes(search);
  });
}
