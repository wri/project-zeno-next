import { formatCompactNumber } from "@/app/utils/boundaryFeatureDetails";
import { formatTooltipValue } from "@/app/utils/formatCharts";

import type { RankedArea, Ranking } from "./ranking";
import type { RankingView } from "./ranking-view";

/** "Bom Jesus, Piauí": the name and, when there is one, the area it lies in. */
function fullName({ name, parent }: RankedArea): string {
  return parent === undefined ? name : `${name}, ${parent}`;
}

/** Between a name and its qualifier, in the bars and in the lists. */
export const QUALIFIER_SEPARATOR = " · ";

/**
 * What names the area in a list: the name, and for a name that repeats the
 * qualifier after a " · ", as the bars show it ("Bom Jesus · Piauí"). Not the
 * tooltip's comma form, which would read as two areas inside a comma list.
 */
export function displayName({ name, qualifier }: RankedArea): string {
  return qualifier === undefined
    ? name
    : `${name}${QUALIFIER_SEPARATOR}${qualifier}`;
}

/** The shortened figure; the exact one only where the short form has none. */
function compactValue(value: number): string {
  return formatCompactNumber(value) ?? formatTooltipValue(value);
}

/** The exact figure: "72,050 ha". */
function exactValue(area: RankedArea, { unit }: Ranking): string {
  return `${formatTooltipValue(area.value)} ${unit}`;
}

/** "8.8%", or "<0.1%" below 0.05 so a small share never reads as none. */
export function shareText(percent: number): string {
  return percent > 0 && percent < 0.05 ? "<0.1%" : `${percent.toFixed(1)}%`;
}

/**
 * The tooltip's two lines, also the row's accessible name: the full name, then
 * the exact value and, when the areas cannot overlap, its share of the total.
 */
export function tooltipLines(
  area: RankedArea,
  ranking: Ranking
): [string, string] {
  const value = exactValue(area, ranking);
  return [
    fullName(area),
    area.share === undefined
      ? value
      : `${value} · ${shareText(area.share)} of all ${ranking.measure} in the ${ranking.areas.length} areas`,
  ];
}

/**
 * The value at the bar's end, shortened ("72.1K ha", "531.6M MgCO₂e") so the
 * bar keeps its width. The tooltip carries the exact figure.
 */
export function barValueText(area: RankedArea, ranking: Ranking): string {
  return `${compactValue(area.value)} ${ranking.unit}`;
}

/** What the row prints after the bar: the value and, in print, the share. */
export function rowValueText(
  area: RankedArea,
  ranking: Ranking,
  print: boolean
): string {
  const value = barValueText(area, ranking);
  return print && area.share !== undefined
    ? `${value} · ${shareText(area.share)}`
    : value;
}

/** Room kept past the longest text: the gap to the bar and a little slack. */
const RESERVE_MARGIN_CH = 2;

/**
 * Width kept beside the longest bar for its printed value, in `ch` (the row
 * uses tabular figures, so a character is one width). Sized from the longest
 * text over every bar of the ranking, not the page, so each page keeps one
 * track and no value is cut off.
 */
export function valueReserve(ranking: Ranking, print: boolean): string {
  const longest = Math.max(
    ...ranking.bars.map((area) => rowValueText(area, ranking, print).length)
  );
  return `${longest + RESERVE_MARGIN_CH}ch`;
}

/** The areas with no value, named in one line instead of drawn as bars. */
export function noValueText(ranking: Ranking, areas: RankedArea[]): string {
  const names = areas.map(displayName);
  const count = `${areas.length} ${areas.length === 1 ? "area" : "areas"}`;
  return `No ${ranking.measure} in ${count}: ${names.join(", ")}.`;
}

export interface PageShare {
  lead: string;
  tail: string;
  /** Percent of the total: the ranks before the page, and the page. */
  beforePct: number;
  pagePct: number;
}

/**
 * How much of the total the view's page holds, and the running total. Absent
 * for a one-page ranking, where the line adds nothing, and when the areas can
 * overlap (no shares), as a share of "all" would be false.
 */
export function pageShare(
  ranking: Ranking,
  view: RankingView
): PageShare | undefined {
  const { bars, total } = ranking;
  if (view.pageCount === 1 || total === undefined) return undefined;
  const sum = (areas: RankedArea[]) =>
    areas.reduce((sum, area) => sum + area.value, 0);
  const beforeSum = sum(bars.slice(0, view.start - 1));
  const pageSum = sum(view.rows);
  const pagePct = (pageSum / total) * 100;
  const noun = `of all ${ranking.measure}`;
  if (view.page === 0) {
    return {
      lead: `Top ${view.end} areas: ${shareText(pagePct)} ${noun}`,
      tail: `(${compactValue(pageSum)} of ${compactValue(total)} ${ranking.unit})`,
      beforePct: 0,
      pagePct,
    };
  }
  return {
    lead: `Ranks ${view.start}–${view.end}: ${shareText(pagePct)} ${noun}`,
    tail: `· top ${view.end}: ${shareText(((beforeSum + pageSum) / total) * 100)}`,
    beforePct: (beforeSum / total) * 100,
    pagePct,
  };
}
