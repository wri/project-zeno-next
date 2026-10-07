import { describe, it, expect } from "vitest";

import {
  getCompactChatLeftPx,
  getCatalogLeftPx,
  getDashboardContentLeftPx,
  getMapAreaToolsLeftPx,
  getMapControlsLeftPx,
  getMapCoveredLeftPx,
  getMapFeedbackLeftPx,
  getMapFitPadding,
} from "@/app/explorationLayout";

describe("explorationLayout", () => {
  it("docks the catalog flush left when chat is compact", () => {
    expect(getCatalogLeftPx(false)).toBe(0);
  });

  it("docks the catalog flush against the full-size chat panel", () => {
    expect(getCatalogLeftPx(true)).toBe(428);
  });

  it("keeps the compact chat inset when the catalog is closed", () => {
    expect(getCompactChatLeftPx(false)).toBe(12);
  });

  it("pushes the compact chat right when the catalog is open", () => {
    expect(getCompactChatLeftPx(true)).toBe(408);
  });

  it("offsets map controls past the compact chat panel when the catalog is closed", () => {
    expect(getMapControlsLeftPx(false, false)).toBe(420);
  });

  it("offsets map controls past the pushed compact chat when the catalog is open", () => {
    expect(getMapControlsLeftPx(false, true)).toBe(816);
  });

  it("offsets area tools beside the catalog when compact chat and catalog are open", () => {
    expect(getMapAreaToolsLeftPx(false, true)).toBe(396);
  });

  it("keeps area tools flush left when compact chat is open without catalog", () => {
    expect(getMapAreaToolsLeftPx(false, false)).toBe(0);
  });

  it("offsets area tools past the full-size chat when the catalog is closed", () => {
    expect(getMapAreaToolsLeftPx(true, false)).toBe(436);
  });

  it("offsets map controls past the full-size chat when the catalog is closed", () => {
    expect(getMapControlsLeftPx(true, false)).toBe(436);
  });

  it("offsets map controls past chat and catalog in full-size mode", () => {
    expect(getMapControlsLeftPx(true, true)).toBe(836);
  });

  it("places map feedback past the catalog column when compact chat and catalog are open", () => {
    expect(getMapFeedbackLeftPx(false, true)).toBe(408);
  });

  it("places map feedback past chat and catalog in full-size mode", () => {
    expect(getMapFeedbackLeftPx(true, true)).toBe(836);
  });

  it("places map feedback past the full-size chat when the catalog is closed", () => {
    expect(getMapFeedbackLeftPx(true, false)).toBe(436);
  });

  it("shifts dashboard content past the full-size chat panel", () => {
    expect(getDashboardContentLeftPx(true)).toBe(436);
  });

  it("keeps dashboard content unshifted when the chat is compact", () => {
    expect(getDashboardContentLeftPx(false)).toBe(0);
  });

  it("covers the map up to the map controls while the chat is open", () => {
    expect(getMapCoveredLeftPx(false, false, false)).toBe(420);
    expect(getMapCoveredLeftPx(true, false, false)).toBe(436);
    expect(getMapCoveredLeftPx(false, false, true)).toBe(816);
  });

  it("leaves the map uncovered when the compact chat is collapsed", () => {
    expect(getMapCoveredLeftPx(false, true, false)).toBe(0);
  });

  it("covers only the catalog column when the chat is collapsed beside it", () => {
    expect(getMapCoveredLeftPx(false, true, true)).toBe(408);
  });

  describe("getMapFitPadding", () => {
    const desktopMap = { mapWidthPx: 1920, mapHeightPx: 1000 };
    // A 420px legend 150px tall, inset 12px from the right and 28px from the bottom.
    const legend = { fromRightPx: 432, fromBottomPx: 178 };

    it("pads the fit past the covered strip", () => {
      expect(
        getMapFitPadding({
          ...desktopMap,
          coveredLeftPx: 420,
          legend: null,
          boundsPx: { width: 100, height: 100 },
        })
      ).toEqual({ top: 50, bottom: 50, right: 50, left: 470 });
    });

    it("falls back to even padding when the visible strip is too narrow", () => {
      expect(
        getMapFitPadding({
          mapWidthPx: 1000,
          mapHeightPx: 800,
          coveredLeftPx: 816,
          legend: null,
          boundsPx: { width: 100, height: 100 },
        })
      ).toEqual({ top: 50, bottom: 50, right: 50, left: 50 });
    });

    it("frames a wide area above the legend", () => {
      expect(
        getMapFitPadding({
          ...desktopMap,
          coveredLeftPx: 420,
          legend,
          boundsPx: { width: 200, height: 100 },
        })
      ).toEqual({ top: 50, bottom: 228, right: 50, left: 470 });
    });

    it("frames a tall area beside the legend", () => {
      expect(
        getMapFitPadding({
          ...desktopMap,
          coveredLeftPx: 420,
          legend,
          boundsPx: { width: 100, height: 200 },
        })
      ).toEqual({ top: 50, bottom: 50, right: 482, left: 470 });
    });

    it("drops the legend clearance when no box fits above or beside it", () => {
      expect(
        getMapFitPadding({
          mapWidthPx: 1100,
          mapHeightPx: 500,
          coveredLeftPx: 420,
          legend: { fromRightPx: 432, fromBottomPx: 300 },
          boundsPx: { width: 100, height: 100 },
        })
      ).toEqual({ top: 50, bottom: 50, right: 50, left: 470 });
    });
  });
});
