import type { RankedArea, Ranking } from "./ranking";

export const PAGE_SIZE = 10;

export interface RankingView {
  /** The current page's bars, largest first. */
  rows: RankedArea[];
  /**
   * The largest value, which every bar on every page is measured against, so
   * a later page shows its areas as the smaller ones.
   */
  scaleMax: number;
  /** 1-based positions of the page's first and last bars, of `total`. */
  start: number;
  end: number;
  /** The bars there are: areas with a value. */
  total: number;
  /** 0-based, clamped to the pages there are. */
  page: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  /** The areas with no value: named in a line, not drawn. */
  noValue: RankedArea[];
}

/**
 * The paged view of a ranking. The page may be stale (kept per widget across
 * renders), so it is clamped. `ranking.areas` is in rank order with the empty
 * areas last (`parseRanking` guarantees it), so the bars are a prefix.
 */
export function rankingView(ranking: Ranking, page: number): RankingView {
  const bars = ranking.areas.filter((area) => area.value > 0);
  const pageCount = Math.max(1, Math.ceil(bars.length / PAGE_SIZE));
  const current = Math.min(Math.max(0, page), pageCount - 1);
  const offset = current * PAGE_SIZE;
  const rows = bars.slice(offset, offset + PAGE_SIZE);

  return {
    rows,
    // The parser rejects a chart with no value, so there is a first bar.
    scaleMax: bars[0].value,
    start: offset + 1,
    end: offset + rows.length,
    total: bars.length,
    page: current,
    pageCount,
    hasPrevious: current > 0,
    hasNext: current < pageCount - 1,
    noValue: ranking.areas.slice(bars.length),
  };
}
