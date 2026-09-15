import { describe, expect, it } from "vitest";

import {
  DEFAULT_ANALYSIS_END_DATE,
  DEFAULT_ANALYSIS_START_DATE,
  resolveAnalysisWindow,
} from "../default-analysis-window";

// Catalogue ids under test (app/constants/datasets.ts).
const LGMS_ID = 12; // declares 2016–2024
const TCL_ID = 4; // declares 2001–2025 — same as the catalogue-wide default
const IFL_ID = 11; // declares no coverage of its own
const UNCATALOGUED_ID = 9999;

describe("resolveAnalysisWindow", () => {
  it("analyses a dataset over the coverage its catalogue card declares", () => {
    // PZB-1355: LGMS data runs 2016–2024. Asking for the catalogue-wide
    // default made the YEARS chip read 2001–25 over 2016–24 numbers.
    expect(resolveAnalysisWindow(LGMS_ID)).toEqual({
      startDate: "2016-01-01",
      endDate: "2024-12-31",
    });
  });

  it("leaves a dataset whose coverage matches the default untouched", () => {
    expect(resolveAnalysisWindow(TCL_ID)).toEqual({
      startDate: DEFAULT_ANALYSIS_START_DATE,
      endDate: DEFAULT_ANALYSIS_END_DATE,
    });
  });

  it("falls back to the catalogue-wide default when the card declares no coverage", () => {
    expect(resolveAnalysisWindow(IFL_ID)).toEqual({
      startDate: DEFAULT_ANALYSIS_START_DATE,
      endDate: DEFAULT_ANALYSIS_END_DATE,
    });
  });

  it("falls back to the catalogue-wide default for an unknown or absent dataset", () => {
    expect(resolveAnalysisWindow(UNCATALOGUED_ID)).toEqual({
      startDate: DEFAULT_ANALYSIS_START_DATE,
      endDate: DEFAULT_ANALYSIS_END_DATE,
    });
    expect(resolveAnalysisWindow(undefined)).toEqual({
      startDate: DEFAULT_ANALYSIS_START_DATE,
      endDate: DEFAULT_ANALYSIS_END_DATE,
    });
  });

  it("prefers a range the user pinned over the dataset's own coverage", () => {
    // The pinned range is explicit user intent; it wins for every dataset.
    expect(
      resolveAnalysisWindow(LGMS_ID, {
        start: new Date(2018, 0, 1),
        end: new Date(2020, 11, 31),
      })
    ).toEqual({ startDate: "2018-01-01", endDate: "2020-12-31" });
  });

  it("ignores an absent pinned range rather than treating it as a window", () => {
    expect(resolveAnalysisWindow(LGMS_ID, null)).toEqual({
      startDate: "2016-01-01",
      endDate: "2024-12-31",
    });
  });
});
