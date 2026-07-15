// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const customAreasState = vi.hoisted(() => ({
  customAreas: [
    {
      id: "area-1",
      user_id: "u1",
      name: "My farm",
      geometries: [],
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ],
  isLoading: false,
}));

const aoiBrowsePages = vi.hoisted(() => ({
  gadm: {
    data: {
      pages: [
        {
          results: [
            {
              source: "gadm",
              src_id: "BRA",
              subtype: "country",
              name: "Brazil",
              bbox: [0, 0, 1, 1],
            },
          ],
          nextOffset: null,
        },
      ],
    },
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  },
  kba: {
    data: {
      pages: [
        {
          results: [
            {
              source: "kba",
              src_id: "KBA-1",
              subtype: "site",
              name: "Some KBA",
              bbox: [0, 0, 1, 1],
            },
          ],
          nextOffset: null,
        },
      ],
    },
    isLoading: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  },
  wdpa: {
    data: { pages: [{ results: [], nextOffset: null }] },
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  },
  landmark: {
    data: { pages: [{ results: [], nextOffset: null }] },
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  },
}));

const aoiBrowseCalls = vi.hoisted(
  () =>
    [] as Array<{
      source: string;
      options?: { enabled?: boolean; search?: string };
    }>
);

vi.mock("@/app/hooks/useCustomAreasList", () => ({
  useCustomAreasList: () => customAreasState,
}));

vi.mock("../useAoiBrowse", () => ({
  useAoiBrowse: (
    source: "gadm" | "kba" | "wdpa" | "landmark",
    options?: { enabled?: boolean; search?: string }
  ) => {
    aoiBrowseCalls.push({ source, options });
    return aoiBrowsePages[source];
  },
}));

vi.mock("../useDashboards", () => ({
  useDashboards: () => ({ data: [] }),
}));

import { useAreaPickerRows } from "../useAreaPickerRows";

describe("useAreaPickerRows", () => {
  beforeEach(() => {
    aoiBrowseCalls.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("merges reference sources and custom areas for 'all', custom last", async () => {
    const { result } = renderHook(() => useAreaPickerRows("all", ""));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.map((r) => r.src_id)).toEqual([
      "BRA",
      "KBA-1",
      "area-1",
    ]);
    expect(result.current.rows[2].typeLabel).toBe("Custom area");
  });

  it("reports hasNextPage true when any source still has a next page", () => {
    const { result } = renderHook(() => useAreaPickerRows("all", ""));
    expect(result.current.hasNextPage).toBe(true);
  });

  it("fetchNextPage advances every source that still has a next page", () => {
    const { result } = renderHook(() => useAreaPickerRows("all", ""));
    result.current.fetchNextPage();
    expect(aoiBrowsePages.kba.fetchNextPage).toHaveBeenCalled();
    expect(aoiBrowsePages.gadm.fetchNextPage).not.toHaveBeenCalled();
  });

  it("scopes to a single reference source when active", async () => {
    const { result } = renderHook(() => useAreaPickerRows("gadm", ""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.map((r) => r.src_id)).toEqual(["BRA"]);
  });

  it("scopes to custom areas only when active", async () => {
    const { result } = renderHook(() => useAreaPickerRows("custom", ""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.map((r) => r.src_id)).toEqual(["area-1"]);
  });

  it("passes the search text through to every reference browse query", () => {
    renderHook(() => useAreaPickerRows("all", "brazil"));
    for (const source of ["gadm", "kba", "wdpa", "landmark"]) {
      expect(
        aoiBrowseCalls.some(
          (c) => c.source === source && c.options?.search === "brazil"
        )
      ).toBe(true);
    }
  });

  it("does not client-filter reference rows (the server ranks name matches)", async () => {
    const { result } = renderHook(() => useAreaPickerRows("all", "brazil"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Mocked browse data stands in for server-filtered results: both
    // reference rows stay; the non-matching custom area is filtered out.
    expect(result.current.rows.map((r) => r.src_id)).toEqual(["BRA", "KBA-1"]);
  });

  it("client-filters custom areas by search", async () => {
    const { result } = renderHook(() => useAreaPickerRows("custom", "farm"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.map((r) => r.src_id)).toEqual(["area-1"]);

    const { result: noMatch } = renderHook(() =>
      useAreaPickerRows("custom", "zzz")
    );
    expect(noMatch.current.rows).toEqual([]);
  });

  it("debounces search changes before re-querying the server", () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(
      ({ search }) => useAreaPickerRows("all", search),
      { initialProps: { search: "" } }
    );

    rerender({ search: "braz" });
    const lastGadmCall = () =>
      aoiBrowseCalls.filter((c) => c.source === "gadm").at(-1);
    expect(lastGadmCall()?.options?.search).toBe("");

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(lastGadmCall()?.options?.search).toBe("braz");
  });
});
