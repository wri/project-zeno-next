/**
 * The benchmark runs the page shows, in any order (AJ, 2026-10-29). Each
 * pins the gnw-gold-evals commit its page is read at, because a run's page
 * can be rebuilt in place on the `benchmark` branch (draft-5's was, on
 * 28 Oct, at f7c138e). So what a deployed page shows changes only with an
 * FE release: add an entry in a PR to develop, check it on staging, then
 * release to main. Release only canonical runs; the trend plots them.
 * `name` gives each run its label, and `draft` alone decides whether the
 * page marks the run as a draft.
 */

type MonthSlug =
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec";

export interface Release {
  /** The release's slug, a three-letter month and a year ("oct-2026"),
   * unique in the list; the page shows it as "October 2026". A bad month
   * does not compile: the label is built when the page module loads, so a
   * bad name would otherwise crash the route. */
  readonly name: `${MonthSlug}-${number}`;
  /** A gnw-gold-evals benchmark run with committed page data. */
  readonly runId: string;
  /** The full gnw-gold-evals commit sha the run's page is read at. */
  readonly ref: string;
  /** Marks the run as a draft: header and hero badges, trend, footer, and
   * the questions whose expected answers are not yet reviewed. */
  readonly draft: boolean;
}

/** At least one: the page always has a run to open on. */
export const RELEASES: readonly [Release, ...Release[]] = [
  // 2026-draft-5, scored by attempt majority.
  {
    name: "oct-2026",
    runId: "20261028T124051Z_prod",
    ref: "f7c138e514c4780ed84003b13a7decdfede8ff21",
    draft: false,
  },
  // 2026 (frozen), the first full run; chart_well_formed rescored before
  // commit (gnw-gold-evals #73, #74).
  {
    name: "nov-2026",
    runId: "20261119T115511Z_prod",
    ref: "edc37fa4255d21bee6937e835f6a71ae48045816",
    draft: false,
  },
];
