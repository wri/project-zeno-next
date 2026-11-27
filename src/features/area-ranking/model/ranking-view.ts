import type { RankedArea, Ranking } from "./ranking";

export const PAGE_SIZE = 10;

export interface RankingView {
  /** The current page's bars, largest first. */
  rows: RankedArea[];
  /** 1-based positions of the page's first and last bars. */
  start: number;
  end: number;
  /** 0-based, clamped to the pages there are. */
  page: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * The paged view of a ranking. The page may be stale (kept per widget across
 * renders), so it is clamped. It pages over `ranking.bars`.
 */
export function rankingView(ranking: Ranking, page: number): RankingView {
  const { bars } = ranking;
  const pageCount = Math.max(1, Math.ceil(bars.length / PAGE_SIZE));
  const current = Math.min(Math.max(0, page), pageCount - 1);
  const offset = current * PAGE_SIZE;
  const rows = bars.slice(offset, offset + PAGE_SIZE);

  return {
    rows,
    start: offset + 1,
    end: offset + rows.length,
    page: current,
    pageCount,
    hasPrevious: current > 0,
    hasNext: current < pageCount - 1,
  };
}
