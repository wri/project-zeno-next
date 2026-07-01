import { describe, it, expect } from "vitest";

import {
  getCompactChatLeftPx,
  getCatalogLeftPx,
  getMapAreaToolsLeftPx,
  getMapControlsLeftPx,
  getMapFeedbackLeftPx,
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
});
