import type { InsightWidget } from "@/app/types/chat";
import { axisUnit } from "@/app/utils/formatCharts";

/** What the bars measure: tree cover loss in hectares, or the emissions of it. */
type RankingMeasure = "loss" | "emissions";

/** The value columns a ranking can have, by the chart's `yAxis`. */
const MEASURES = new Map<string, RankingMeasure>([
  ["area_ha", "loss"],
  ["carbon_emissions_MgCO2e", "emissions"],
]);

/**
 * This slice is the only renderer of the chart type, so the type is the
 * discriminator for its bespoke rendering path.
 */
export function isRankingWidget(widget: InsightWidget): boolean {
  return widget.type === "ranked-bar";
}

/** One area of the ranking, as the chart draws and words it. */
export interface RankedArea {
  /** The area's identity: names repeat ("Bom Jesus" in two states). */
  aoiId: string;
  /** Competition rank: ties share a rank (1, 2, 3, 4, 4, 6). */
  rank: number;
  name: string;
  /** The area it lies in ("Piauí" for "Bom Jesus"), absent when it has none. */
  parent?: string;
  /**
   * The parent, set only when the name repeats in this chart and there is a
   * parent to tell the areas apart by.
   */
  qualifier?: string;
  /** Always ≥ 0. Zero means no loss (or no emissions). */
  value: number;
  /**
   * Percent of the value over all the areas. Absent when the areas can overlap,
   * so a share of "all" would be false.
   */
  share?: number;
}

export interface Ranking {
  measure: RankingMeasure;
  /** The value's unit, as the one-area chart labels it ("ha", "MgCO₂e"). */
  unit: string;
  /** Every area of the pull in rank order, those with no value last. */
  areas: RankedArea[];
  /** The areas with a value, in rank order: the ones drawn as bars. */
  bars: RankedArea[];
  /** The areas with no value: named in a line, not drawn. */
  noValue: RankedArea[];
  /**
   * The bars' values summed, which the shares are of. Absent when the areas
   * have no shares (they can overlap), so a share of "all" would be false.
   */
  total?: number;
}

/**
 * The one place the split of bars and no-value areas is made. `areas` must be
 * in rank order with the empty areas last, as `parseRanking` guarantees.
 */
export function rankingOf(
  measure: RankingMeasure,
  unit: string,
  areas: RankedArea[]
): Ranking {
  const bars = areas.filter((area) => area.value > 0);
  const hasShares = areas.every((area) => area.share !== undefined);
  return {
    measure,
    unit,
    areas,
    bars,
    noValue: areas.slice(bars.length),
    ...(hasShares
      ? { total: bars.reduce((sum, area) => sum + area.value, 0) }
      : {}),
  };
}

function fail(index: number, problem: string): never {
  throw new Error(`Area ranking: row ${index} ${problem}`);
}

function readString(
  row: Record<string, unknown>,
  key: string,
  index: number
): string {
  const value = row[key];
  if (typeof value !== "string") fail(index, `has no ${key}`);
  return value;
}

function readNumber(
  row: Record<string, unknown>,
  key: string,
  index: number
): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(index, `has no numeric ${key}`);
  }
  return value;
}

/**
 * Anti-corruption layer for the curated `ranked-bar` chart's rows. The only
 * place that knows the wire's column names (`aoi_id`, `share_pct`, the value
 * column named by `yAxis`); everything downstream takes `Ranking`. The rows
 * arrive in rank order and are kept in it.
 *
 * A chart that cannot be drawn truthfully throws, so the widget's error
 * boundary shows "Unable to render chart" instead of a wrong ranking: a row
 * with a missing or mistyped field, a repeated area, a value above the row
 * before it (every bar is measured against the first), no value at all, a
 * value column this chart has no wording for, or shares on only some rows.
 */
export function parseRanking(data: unknown, yAxis: string): Ranking {
  const measure = MEASURES.get(yAxis);
  if (measure === undefined) {
    throw new Error(`Area ranking: unknown value column "${yAxis}"`);
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Area ranking: chart data is not a list of rows");
  }

  const rows = data.map((row: unknown, index) => {
    if (typeof row !== "object" || row === null)
      fail(index, "is not an object");
    return row as Record<string, unknown>;
  });
  const withShare = rows.filter((row) => row.share_pct !== undefined).length;
  if (withShare !== 0 && withShare !== rows.length) {
    throw new Error("Area ranking: share_pct is on some rows only");
  }

  const nameCounts = new Map<string, number>();
  const seen = new Set<string>();
  const parsed = rows.map((row, index) => {
    const aoiId = readString(row, "aoi_id", index);
    if (seen.has(aoiId)) fail(index, `repeats ${aoiId}`);
    seen.add(aoiId);
    const name = readString(row, "name", index);
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    const parent =
      row.parent === null ? undefined : readString(row, "parent", index);
    const value = readNumber(row, yAxis, index);
    if (value < 0) fail(index, `has a negative ${yAxis}`);
    return {
      aoiId,
      rank: readNumber(row, "rank", index),
      name,
      ...(parent !== undefined ? { parent } : {}),
      value,
      ...(withShare > 0 ? { share: readNumber(row, "share_pct", index) } : {}),
    };
  });

  parsed.forEach((area, index) => {
    if (index > 0 && area.value > parsed[index - 1].value) {
      fail(index, "is larger than the row before it");
    }
  });
  if (parsed[0].value === 0) {
    throw new Error("Area ranking: every value is 0");
  }

  return rankingOf(
    measure,
    axisUnit(yAxis),
    parsed.map((area) =>
      area.parent !== undefined && (nameCounts.get(area.name) ?? 0) > 1
        ? { ...area, qualifier: area.parent }
        : area
    )
  );
}

/**
 * The table and CSV show the chart's own rows, so the wire column names the
 * table needs live here too: rank, name, parent, the value, the share; the
 * area id is for the CSV only.
 */
export function rankingTableProps(yAxis: string) {
  return {
    columnOrder: ["rank", "name", "parent", yAxis, "share_pct"],
    hiddenColumns: ["aoi_id"],
  };
}
