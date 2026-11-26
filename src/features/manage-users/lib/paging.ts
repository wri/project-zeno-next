export const PAGE_SIZES = [50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 100;

/**
 * The rows on `page` (1-based). A page past the end, left by a list that
 * shrank under it, shows the last page instead.
 */
export function pageOf<T>(rows: readonly T[], page: number, size: PageSize) {
  const lastPage = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, lastPage);
  const start = (current - 1) * size;
  const pageRows = rows.slice(start, start + size);
  return {
    page: current,
    lastPage,
    rows: pageRows,
    /** 1-based positions of the first and last row shown. */
    first: start + 1,
    last: start + pageRows.length,
  };
}
