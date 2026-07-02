import { describe, it, expect, vi } from "vitest";

// isGlobalQuery lives in pickAoi.ts, whose import chain reaches mapStore
// (MapLibre/terra-draw) and the Chakra toaster (.tsx) — none of which load in
// the node test environment. Stub those module boundaries so the pure helper
// can be imported in isolation.
vi.mock("@/app/store/mapStore", () => ({
  default: { getState: () => ({}) },
}));

vi.mock("@/app/utils/geometryClient", () => ({
  fetchGeometry: vi.fn(),
}));

import { isGlobalQuery } from "../pickAoi";

describe("isGlobalQuery", () => {
  it("matches the backend's canonical global selection name", () => {
    // Regression guard: the backend resolves a worldwide query to the selection
    // name "All countries in the world". A prior exact match against
    // "all countries" never matched it, so the FE fell through to fetching and
    // rendering ~250 country polygons — an out-of-memory renderer crash.
    expect(isGlobalQuery("All countries in the world")).toBe(true);
  });

  it("accepts the bare 'all countries' alias, case- and space-insensitively", () => {
    expect(isGlobalQuery("all countries")).toBe(true);
    expect(isGlobalQuery("  All Countries  ")).toBe(true);
    expect(isGlobalQuery("ALL COUNTRIES IN THE WORLD")).toBe(true);
  });

  it("does not treat a sub-global or single-country selection as global", () => {
    // Must stay an exact match — a substring check would wrongly route these
    // through the global GADM vector layer instead of their real geometry.
    expect(isGlobalQuery("All countries in the EU")).toBe(false);
    expect(isGlobalQuery("Brazil")).toBe(false);
    expect(isGlobalQuery("Pará, Brazil")).toBe(false);
    expect(isGlobalQuery("")).toBe(false);
  });
});
