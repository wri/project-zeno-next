import { describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({ default: { addProtocol: vi.fn() } }));

import { wrapPrimaryForestTileUrl } from "../primaryForestTileProtocol";

describe("wrapPrimaryForestTileUrl", () => {
  const url =
    "https://tiles.globalforestwatch.org/umd_regional_primary_forest_2001/v201901/uint16/{z}/{x}/{y}.png";

  it("routes the tile URL through the pf:// protocol", () => {
    expect(wrapPrimaryForestTileUrl(url)).toBe(`pf://${url}`);
  });

  it("does not wrap an already-wrapped URL twice", () => {
    // A layer's tileUrl can flow back through a second patch (e.g. a map
    // widget built from an explorer layer); pf://pf:// would never resolve.
    expect(wrapPrimaryForestTileUrl(`pf://${url}`)).toBe(`pf://${url}`);
  });
});
