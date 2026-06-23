import { describe, it, expect } from "vitest";

import {
  getCompactChatLeftPx,
  getDataCatalogLeftPx,
  getMapControlsLeftPx,
} from "@/app/explorationLayout";

describe("explorationLayout", () => {
  it("docks the catalog flush left when chat is compact", () => {
    expect(getDataCatalogLeftPx(false)).toBe(0);
  });

  it("docks the catalog flush against the full-size chat panel", () => {
    expect(getDataCatalogLeftPx(true)).toBe(428);
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

  it("offsets map controls past the full-size chat when the catalog is closed", () => {
    expect(getMapControlsLeftPx(true, false)).toBe(436);
  });

  it("offsets map controls past chat and catalog in full-size mode", () => {
    expect(getMapControlsLeftPx(true, true)).toBe(836);
  });
});
