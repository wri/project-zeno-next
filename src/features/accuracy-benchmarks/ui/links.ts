/** The page's three views live in `?view=`, the run in `?run=`, so a view
 * of a given run can be bookmarked and shared. */

export const VIEWS = ["dashboard", "questions", "methodology"] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_LABELS: Readonly<Record<View, string>> = {
  dashboard: "Dashboard",
  questions: "All questions",
  methodology: "Methodology",
};

export function isView(value: string | null): value is View {
  return !!value && (VIEWS as readonly string[]).includes(value);
}

export const PAGE_PATH = "/accuracy-benchmarks";

export function pageHref(params: {
  readonly view?: View;
  readonly run?: string | null;
  readonly useCase?: string;
  /** An anchor on the target view, e.g. "question-types". */
  readonly hash?: string;
}): string {
  const search = new URLSearchParams();
  if (params.view && params.view !== "dashboard")
    search.set("view", params.view);
  if (params.run) search.set("run", params.run);
  if (params.useCase) search.set("uc", params.useCase);
  const query = search.toString();
  const anchor = params.hash ? `#${params.hash}` : "";
  return `${PAGE_PATH}${query ? `?${query}` : ""}${anchor}`;
}
