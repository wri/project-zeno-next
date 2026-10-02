/**
 * Client-side paging for the dashboards grid.
 *
 * `GET /api/dashboards` takes no query parameters and returns the caller's
 * whole list in one response, so paging is a pure slice over data we already
 * hold, not a request boundary.
 */

export interface PaginatedResult<T> {
  items: T[];
  /** 1-based, clamped into range. */
  page: number;
  /** Always at least 1, so an empty list still has a valid page 1. */
  totalPages: number;
}

/**
 * Slice `items` into a page.
 *
 * The requested page is clamped rather than trusted: deleting the only
 * dashboard on the last page shrinks `totalPages` underneath a page number
 * held in component state, and an unclamped slice would render an empty grid
 * with no way back. Clamping here, instead of correcting state in an effect,
 * keeps the displayed page a pure function of the list and avoids a render
 * pass showing the empty intermediate.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(Math.trunc(page), 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  };
}

/**
 * Most recently updated first.
 *
 * Order only became load-bearing once the grid started paging: without it the
 * server's arbitrary order could drop a dashboard you just created onto page 3.
 * Unparseable dates sort last so a bad timestamp can't displace real entries
 * from page 1.
 */
export function byRecentlyUpdated(
  a: { updated_at: string },
  b: { updated_at: string }
): number {
  const timeA = new Date(a.updated_at).getTime();
  const timeB = new Date(b.updated_at).getTime();
  if (Number.isNaN(timeA)) return Number.isNaN(timeB) ? 0 : 1;
  if (Number.isNaN(timeB)) return -1;
  return timeB - timeA;
}
