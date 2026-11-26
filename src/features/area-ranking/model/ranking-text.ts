import { formatHectares } from "@/app/utils/boundaryFeatureDetails";
import { formatTooltipValue } from "@/app/utils/formatCharts";

import type { RankedArea, Ranking } from "./ranking";

const NO_VALUE_PHRASE = {
  loss: "No tree cover loss",
  emissions: "No emissions",
} as const;

/** "Bom Jesus, Piauí": the name and, when there is one, the area it lies in. */
function fullName({ name, parent }: RankedArea): string {
  return parent === null ? name : `${name}, ${parent}`;
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
 * The value at the bar's end. Loss is hectares, shortened; emissions have no
 * short form here, so they read as the exact figure.
 */
export function barValueText(area: RankedArea, ranking: Ranking): string {
  const exact = exactValue(area, ranking);
  return ranking.measure === "loss"
    ? (formatHectares(area.value) ?? exact)
    : exact;
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
    ...ranking.areas
      .filter((area) => area.value > 0)
      .map((area) => rowValueText(area, ranking, print).length)
  );
  return `${longest + RESERVE_MARGIN_CH}ch`;
}

/** The areas with no value, named in one line instead of drawn as bars. */
export function noValueText(ranking: Ranking, areas: RankedArea[]): string {
  const names = areas.map((area) =>
    area.showParent ? fullName(area) : area.name
  );
  const count = `${areas.length} ${areas.length === 1 ? "area" : "areas"}`;
  return `${NO_VALUE_PHRASE[ranking.measure]} in ${count}: ${names.join(", ")}.`;
}

/** The PDF's note under a ranking cut to its first page. */
export function topNoteText(shown: number, areaCount: number): string {
  return `Top ${shown} of ${areaCount} areas.`;
}
