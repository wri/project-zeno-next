import { describe, expect, it } from "vitest";

import {
  imageryLayerTitle,
  imageryLegendCloudNote,
  imageryLegendInfo,
  imageryLegendParams,
  type ImageryLegendMeta,
} from "../imageryLegend";

// A freshly built mosaic: every metadata field the backend can emit.
const fullMeta: ImageryLegendMeta = {
  item_count: 4,
  date_start: "2024-05-28",
  date_end: "2024-06-03",
  target_date: "2024-06-01",
  window_days: 7,
  max_cloud_cover: 20,
  aoi_names: ["Ucayali", "Loreto"],
};

describe("imageryLegendParams", () => {
  it("builds DATES, WINDOW, CLOUD and AREA chips from full metadata", () => {
    expect(imageryLegendParams(fullMeta)).toEqual([
      { label: "DATES", value: "May 28 – Jun 3, 2024", maxValueWidth: "26ch" },
      { label: "WINDOW", value: "±7 days" },
      { label: "CLOUD", value: "< 20%" },
      { label: "AREA", value: "Ucayali, Loreto" },
    ]);
  });

  it("omits the DATES chip on cache hits (no acquired date range)", () => {
    const params = imageryLegendParams({
      ...fullMeta,
      date_start: undefined,
      date_end: undefined,
    });
    expect(params.map((p) => p.label)).toEqual(["WINDOW", "CLOUD", "AREA"]);
  });

  it("omits constraint chips absent from pre-fields payloads", () => {
    const params = imageryLegendParams({
      ...fullMeta,
      window_days: undefined,
      max_cloud_cover: undefined,
    });
    expect(params.map((p) => p.label)).toEqual(["DATES", "AREA"]);
  });

  it("omits the AREA chip without any area names", () => {
    expect(
      imageryLegendParams({ ...fullMeta, aoi_names: [] }).map((p) => p.label)
    ).toEqual(["DATES", "WINDOW", "CLOUD"]);
    expect(
      imageryLegendParams({ ...fullMeta, aoi_names: undefined }).map(
        (p) => p.label
      )
    ).toEqual(["DATES", "WINDOW", "CLOUD"]);
  });

  it("returns no chips for an empty payload", () => {
    expect(imageryLegendParams({})).toEqual([]);
  });

  it("keeps both years on a range crossing a year boundary", () => {
    const params = imageryLegendParams({
      date_start: "2023-12-28",
      date_end: "2024-01-04",
    });
    expect(params[0].value).toBe("Dec 28, 2023 – Jan 4, 2024");
  });

  it("falls back to the raw string for unparseable dates", () => {
    const params = imageryLegendParams({
      date_start: "not-a-date",
      date_end: "2024-06-03",
    });
    expect(params[0].value).toBe("not-a-date – Jun 3, 2024");
  });
});

describe("imageryLegendInfo", () => {
  it("describes the mosaic with scene count and target date", () => {
    expect(imageryLegendInfo(fullMeta)).toBe(
      "Sentinel-2 true-colour mosaic built from 4 scenes closest to " +
        "Jun 1, 2024. Contains modified Copernicus Sentinel data."
    );
  });

  it("uses the singular for a one-scene mosaic", () => {
    expect(imageryLegendInfo({ ...fullMeta, item_count: 1 })).toContain(
      "built from 1 scene closest to"
    );
  });

  it("drops the scene count on cache hits", () => {
    expect(imageryLegendInfo({ ...fullMeta, item_count: undefined })).toBe(
      "Sentinel-2 true-colour mosaic closest to Jun 1, 2024. " +
        "Contains modified Copernicus Sentinel data."
    );
  });

  it("still describes the layer with no metadata at all", () => {
    expect(imageryLegendInfo({})).toBe(
      "Sentinel-2 true-colour mosaic. Contains modified Copernicus Sentinel data."
    );
  });
});

describe("imageryLegendCloudNote", () => {
  it("returns a note when the search loosened the cloud-cover limit", () => {
    expect(imageryLegendCloudNote({ max_cloud_cover: 60 })).toBe(
      "Searched with a loosened cloud-cover limit (60%) — imagery may contain clouds."
    );
  });

  it("returns nothing at or below the default limit", () => {
    expect(imageryLegendCloudNote({ max_cloud_cover: 20 })).toBeUndefined();
    expect(imageryLegendCloudNote({ max_cloud_cover: 5 })).toBeUndefined();
    expect(imageryLegendCloudNote({})).toBeUndefined();
  });
});

describe("imageryLayerTitle", () => {
  it("stamps the target date into the title", () => {
    expect(imageryLayerTitle("2024-06-01")).toBe(
      "Satellite imagery (Jun 1, 2024)"
    );
  });

  it("falls back to the bare name without (or with a bad) date", () => {
    expect(imageryLayerTitle(undefined)).toBe("Satellite imagery");
    expect(imageryLayerTitle("not-a-date")).toBe("Satellite imagery");
  });
});
