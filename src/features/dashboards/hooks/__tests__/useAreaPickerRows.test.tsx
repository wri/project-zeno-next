// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const browseCalls = vi.hoisted(() => [] as { source: string; name?: string }[]);

vi.mock("@/app/hooks/useCustomAreasList", () => ({
  useCustomAreasList: () => customAreasState,
}));

vi.mock("../useAoiBrowse", () => ({
  useAoiBrowse: (
    source: "gadm" | "kba" | "wdpa" | "landmark",
    options?: { enabled?: boolean; name?: string }
  ) => {
    browseCalls.push({ source, name: options?.name });
    return aoiBrowsePages[source];
  },
}));

vi.mock("../useDashboards", () => ({
  useDashboards: () => ({ data: [] }),
}));

import { useAreaPickerRows } from "../useAreaPickerRows";

describe("useAreaPickerRows", () => {
  beforeEach(() => {
    browseCalls.length = 0;
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

  it("threads the search term to every reference source as a server-side query", () => {
    renderHook(() => useAreaPickerRows("all", "brazil"));
    for (const source of ["gadm", "kba", "wdpa", "landmark"]) {
      expect(browseCalls).toContainEqual({ source, name: "brazil" });
    }
  });

  it("trusts server-side filtering for reference rows and filters custom client-side", async () => {
    // "Some KBA" does not contain "brazil" but is kept — the server, not the
    // client, decides which reference rows match. The custom "My farm" is
    // dropped because custom areas are filtered locally.
    const { result } = renderHook(() => useAreaPickerRows("all", "brazil"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows.map((r) => r.src_id)).toEqual(["BRA", "KBA-1"]);
  });

  it("filters custom areas client-side by the search term", async () => {
    const match = renderHook(() => useAreaPickerRows("custom", "farm"));
    await waitFor(() => expect(match.result.current.isLoading).toBe(false));
    expect(match.result.current.rows.map((r) => r.src_id)).toEqual(["area-1"]);

    const miss = renderHook(() => useAreaPickerRows("custom", "zzz"));
    await waitFor(() => expect(miss.result.current.isLoading).toBe(false));
    expect(miss.result.current.rows).toEqual([]);
  });
});
