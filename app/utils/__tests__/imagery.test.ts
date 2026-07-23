import { describe, it, expect } from "vitest";

import {
  buildImageryGroup,
  captureMetaLabel,
  formatCaptureDate,
  imageryCardDescription,
  imageryCloudNote,
  imageryLayerId,
  imageryLayerTitle,
  imageryLegendInfo,
  imageryLegendParams,
  imageryThumbnailUrl,
  isImageryLayerId,
} from "@/app/utils/imagery";
import type { Layer } from "@/app/store/layerManagerSlice";

const fullMeta = {
  item_count: 9,
  date_start: "2026-06-12",
  date_end: "2026-06-16",
  target_date: "2026-06-15",
  window_days: 30,
  max_cloud_cover: 50,
  aoi_names: ["Paracas National Reserve"],
};

describe("imageryLegendParams", () => {
  it("builds DATES, WINDOW, CLOUD and AREA chips from full metadata", () => {
    const params = imageryLegendParams(fullMeta);
    expect(params).toEqual([
      {
        label: "DATES",
        value: "Jun 12 – Jun 16, 2026",
        maxValueWidth: "26ch",
      },
      { label: "WINDOW", value: "±30 days" },
      { label: "CLOUD", value: "< 50%" },
      { label: "AREA", value: "Paracas National Reserve" },
    ]);
  });

  it("keeps the start year on a cross-year range", () => {
    const params = imageryLegendParams({
      date_start: "2025-12-28",
      date_end: "2026-01-04",
    });
    expect(params[0].value).toBe("Dec 28, 2025 – Jan 4, 2026");
  });

  it("joins multiple AOI names into one AREA chip", () => {
    const params = imageryLegendParams({ aoi_names: ["Peru", "Paracas"] });
    expect(params).toEqual([{ label: "AREA", value: "Peru, Paracas" }]);
  });

  it("omits every chip whose metadata is missing", () => {
    expect(imageryLegendParams({})).toEqual([]);
    expect(imageryLegendParams({ date_start: "2026-06-12" })).toEqual([]);
    expect(imageryLegendParams({ aoi_names: [] })).toEqual([]);
  });

  it("falls back to full dates when a bound is unparseable", () => {
    const params = imageryLegendParams({
      date_start: "not-a-date",
      date_end: "2026-06-16",
    });
    expect(params[0].value).toBe("not-a-date – Jun 16, 2026");
  });
});

describe("imageryLegendInfo", () => {
  it("mentions scene count, target date and attribution", () => {
    expect(imageryLegendInfo(fullMeta)).toBe(
      "Sentinel-2 true-colour mosaic built from 9 scenes closest to Jun 15, 2026. Contains modified Copernicus Sentinel data."
    );
  });

  it("singularises one scene and skips missing parts", () => {
    expect(imageryLegendInfo({ item_count: 1 })).toBe(
      "Sentinel-2 true-colour mosaic built from 1 scene. Contains modified Copernicus Sentinel data."
    );
    expect(imageryLegendInfo({})).toBe(
      "Sentinel-2 true-colour mosaic. Contains modified Copernicus Sentinel data."
    );
  });

  it("includes observed mean cloud cover when present", () => {
    expect(imageryLegendInfo({ mean_cloud_cover: 12.4 })).toContain(
      "Mean observed cloud cover 12%."
    );
  });
});

describe("imageryCloudNote", () => {
  it("returns a note above the default cloud limit", () => {
    expect(imageryCloudNote({ max_cloud_cover: 50 })).toBe(
      "Searched with a loosened cloud-cover limit (50%) — imagery may contain clouds."
    );
  });

  it("returns undefined at or below the default, or when unknown", () => {
    expect(imageryCloudNote({ max_cloud_cover: 20 })).toBeUndefined();
    expect(imageryCloudNote({ max_cloud_cover: 10 })).toBeUndefined();
    expect(imageryCloudNote({})).toBeUndefined();
  });
});

describe("imageryCardDescription", () => {
  it("uses the tight in-month range with cloud limit and source", () => {
    expect(
      imageryCardDescription({
        date_start: "2026-06-12",
        date_end: "2026-06-16",
        max_cloud_cover: 50,
      })
    ).toBe("Jun 12–16 · cloud <50% · Sentinel-2");
  });

  it("spells out cross-month and cross-year ranges", () => {
    expect(
      imageryCardDescription({
        date_start: "2026-05-28",
        date_end: "2026-06-03",
      })
    ).toBe("May 28 – Jun 3 · Sentinel-2");
    expect(
      imageryCardDescription({
        date_start: "2025-12-28",
        date_end: "2026-01-04",
      })
    ).toBe("Dec 28, 2025 – Jan 4, 2026 · Sentinel-2");
  });

  it("falls back to the target date, then to the source alone", () => {
    expect(
      imageryCardDescription({ target_date: "2026-06-15", max_cloud_cover: 20 })
    ).toBe("Jun 15, 2026 · cloud <20% · Sentinel-2");
    expect(imageryCardDescription({})).toBe("Sentinel-2");
  });

  it("collapses a single-day range to one date", () => {
    expect(
      imageryCardDescription({
        date_start: "2026-06-12",
        date_end: "2026-06-12",
      })
    ).toBe("Jun 12 · Sentinel-2");
  });
});

describe("captureMetaLabel", () => {
  it("combines cloud limit and scene count", () => {
    expect(captureMetaLabel(fullMeta)).toBe("cloud <50% · 9 scenes");
    expect(captureMetaLabel({ item_count: 1 })).toBe("1 scene");
    expect(captureMetaLabel({ max_cloud_cover: 20 })).toBe("cloud <20%");
    expect(captureMetaLabel({})).toBe("");
  });
});

describe("titles and ids", () => {
  it("formats the layer title with the target date", () => {
    expect(imageryLayerTitle("2026-06-15")).toBe(
      "Satellite Imagery (Jun 15, 2026)"
    );
    expect(imageryLayerTitle()).toBe("Satellite Imagery");
    expect(imageryLayerTitle("garbage")).toBe("Satellite Imagery (garbage)");
  });

  it("formats capture dates per the design", () => {
    expect(formatCaptureDate("2026-06-15")).toBe("15 Jun 2026");
    expect(formatCaptureDate("garbage")).toBe("garbage");
  });

  it("builds and recognises imagery layer ids", () => {
    expect(imageryLayerId("abc123")).toBe("imagery-abc123");
    expect(isImageryLayerId("imagery-abc123")).toBe(true);
    expect(isImageryLayerId("dataset-4")).toBe(false);
  });
});

describe("buildImageryGroup", () => {
  const imageryLayer = (
    id: string,
    overrides: Partial<Layer> = {},
    metaOverrides: Record<string, unknown> = {}
  ): Layer =>
    ({
      id,
      name: "Satellite Imagery",
      type: "raster",
      visible: true,
      opacity: 0.8,
      tileUrl: "https://tiles.example.com/{z}/{x}/{y}.png",
      bounds: [-1, -1, 1, 1],
      minzoom: 8,
      maxzoom: 14,
      imagery: { ...fullMeta, mosaic_id: id, ...metaOverrides },
      ...overrides,
    }) as Layer;

  it("returns null when there are no captures and nothing updating", () => {
    expect(buildImageryGroup([], false)).toBeNull();
  });

  it("builds the group from the newest (first) capture", () => {
    const group = buildImageryGroup(
      [
        imageryLayer("imagery-new"),
        imageryLayer(
          "imagery-old",
          { visible: false },
          { target_date: "2026-05-15", aoi_names: ["Pacaya-Samiria"] }
        ),
      ],
      false
    );

    expect(group).toMatchObject({
      kind: "imagery",
      id: "imagery-group",
      title: "Satellite Imagery",
      opacity: 80,
      updating: false,
      areaCount: 2,
    });
    expect(group?.params.map((p) => p.label)).toEqual([
      "DATES",
      "WINDOW",
      "CLOUD",
      "AREA",
    ]);
    expect(group?.captures).toHaveLength(2);
    expect(group?.captures[0]).toMatchObject({
      layerId: "imagery-new",
      live: true,
      visible: true,
      dateLabel: "15 Jun 2026",
      metaLabel: "cloud <50% · 9 scenes",
    });
    expect(group?.captures[1]).toMatchObject({
      layerId: "imagery-old",
      live: false,
      visible: false,
      areaLabel: "Pacaya-Samiria",
    });
    expect(group?.captures[0].thumbnailUrl).toContain("/8/128/128");
  });

  it("returns an updating stub when no capture has landed yet", () => {
    const group = buildImageryGroup([], true);
    expect(group).toMatchObject({
      kind: "imagery",
      updating: true,
      captures: [],
      params: [],
      areaCount: 0,
    });
    expect(group?.info).toBeUndefined();
  });
});

describe("imageryThumbnailUrl", () => {
  const template = "https://tiles.example.com/{z}/{x}/{y}.png?url=s3";

  it("substitutes the centre tile at a zoom matching the extent", () => {
    // 2°×2° extent centred on (0,0): zoom = ceil(log2(360/2)) = 8, centre
    // tile of the 256×256 grid.
    expect(imageryThumbnailUrl(template, [-1, -1, 1, 1])).toBe(
      "https://tiles.example.com/8/128/128.png?url=s3"
    );
  });

  it("clamps the zoom to the mosaic's range", () => {
    const url = imageryThumbnailUrl(template, [-1, -1, 1, 1], 10, 14);
    expect(url).toContain("/10/");
    const wide = imageryThumbnailUrl(template, [-170, -60, 170, 60], 8, 14);
    expect(wide).toContain("/8/");
  });

  it("returns undefined without bounds or with a degenerate extent", () => {
    expect(imageryThumbnailUrl(template)).toBeUndefined();
    expect(imageryThumbnailUrl(template, [10, 10, 10, 10])).toBeUndefined();
  });
});
