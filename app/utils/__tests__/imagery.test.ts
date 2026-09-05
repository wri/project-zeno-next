import { describe, it, expect } from "vitest";

import {
  buildImageryGroup,
  captureMetaLabel,
  formatCaptureDate,
  imageryAttribution,
  imageryCloudNote,
  imageryLayerId,
  imageryLayerTitle,
  imageryLegendInfo,
  imageryLegendParams,
  imagerySubtitle,
  imageryThumbnailUrl,
  isImageryLayerId,
  isImageryTool,
  toImageryMeta,
} from "@/app/utils/imagery";
import type { ImageryLegendMeta } from "@/app/utils/imagery";
import type { Layer } from "@/app/store/layerManagerSlice";

describe("toImageryMeta", () => {
  it("resolves an explicit provider", () => {
    expect(toImageryMeta({ provider: "planet" }).provider).toBe("planet");
  });

  it("defaults a missing provider to sentinel-2", () => {
    expect(toImageryMeta({}).provider).toBe("sentinel-2");
  });

  it("treats an explicit null provider the same as a missing one", () => {
    expect(toImageryMeta({ provider: null }).provider).toBe("sentinel-2");
  });

  it("prefers start_date/end_date over the legacy date_start/date_end names", () => {
    const meta = toImageryMeta({
      start_date: "2026-06-12",
      end_date: "2026-06-16",
      date_start: "2020-01-01",
      date_end: "2020-01-02",
    });
    expect(meta.startDate).toBe("2026-06-12");
    expect(meta.endDate).toBe("2026-06-16");
  });

  it("falls back to the legacy date_start/date_end names on old payloads", () => {
    const meta = toImageryMeta({
      date_start: "2026-06-12",
      date_end: "2026-06-16",
    });
    expect(meta.startDate).toBe("2026-06-12");
    expect(meta.endDate).toBe("2026-06-16");
  });

  it("passes numeric, string and array fields through unchanged", () => {
    expect(
      toImageryMeta({
        item_count: 9,
        target_date: "2026-06-15",
        window_days: 30,
        max_cloud_cover: 50,
        mean_cloud_cover: 12.4,
        aoi_names: ["Paracas National Reserve"],
      })
    ).toEqual({
      provider: "sentinel-2",
      itemCount: 9,
      startDate: undefined,
      endDate: undefined,
      targetDate: "2026-06-15",
      windowDays: 30,
      maxCloudCover: 50,
      meanCloudCover: 12.4,
      aoiNames: ["Paracas National Reserve"],
    });
  });

  it("normalizes every explicit backend null to undefined, never the string 'null'", () => {
    const meta = toImageryMeta({
      item_count: null,
      target_date: null,
      window_days: null,
      max_cloud_cover: null,
      mean_cloud_cover: null,
    });
    expect(meta).toMatchObject({
      itemCount: undefined,
      targetDate: undefined,
      windowDays: undefined,
      maxCloudCover: undefined,
      meanCloudCover: undefined,
    });
  });

  it("defaults aoiNames to an empty array when absent", () => {
    expect(toImageryMeta({}).aoiNames).toEqual([]);
  });
});

const fullMeta = {
  item_count: 9,
  start_date: "2026-06-12",
  end_date: "2026-06-16",
  target_date: "2026-06-15",
  window_days: 30,
  max_cloud_cover: 50,
  aoi_names: ["Paracas National Reserve"],
};

// A Planet monthly-basemap payload as the backend actually serialises it
// (wri/project-zeno#800): fields the provider has no value for are explicit
// JSON nulls, not omitted.
const planetMeta: ImageryLegendMeta = {
  provider: "planet",
  item_count: null,
  start_date: "2026-07-01",
  end_date: "2026-07-31",
  mean_cloud_cover: null,
  min_cloud_cover: null,
  max_cloud_cover_observed: null,
  target_date: "2026-07-01",
  window_days: null,
  max_cloud_cover: null,
  aoi_names: ["Tabatinga, Amazonas, Brazil"],
};

describe("imageryLegendParams", () => {
  it("builds DATES, WINDOW, CLOUD and AREA chips from full metadata", () => {
    const params = imageryLegendParams(toImageryMeta(fullMeta));
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
    const params = imageryLegendParams(
      toImageryMeta({ date_start: "2025-12-28", date_end: "2026-01-04" })
    );
    expect(params[0].value).toBe("Dec 28, 2025 – Jan 4, 2026");
  });

  it("joins multiple AOI names into one AREA chip", () => {
    const params = imageryLegendParams(
      toImageryMeta({ aoi_names: ["Peru", "Paracas"] })
    );
    expect(params).toEqual([{ label: "AREA", value: "Peru, Paracas" }]);
  });

  it("omits every chip whose metadata is missing", () => {
    expect(imageryLegendParams(toImageryMeta({}))).toEqual([]);
    expect(
      imageryLegendParams(toImageryMeta({ start_date: "2026-06-12" }))
    ).toEqual([]);
    expect(imageryLegendParams(toImageryMeta({ aoi_names: [] }))).toEqual([]);
  });

  it("treats a Planet monthly basemap's null stats as absent", () => {
    expect(imageryLegendParams(toImageryMeta(planetMeta))).toEqual([
      {
        label: "DATES",
        value: "Jul 1 – Jul 31, 2026",
        maxValueWidth: "26ch",
      },
      { label: "AREA", value: "Tabatinga, Amazonas, Brazil" },
    ]);
  });

  it("falls back to full dates when a bound is unparseable", () => {
    const params = imageryLegendParams(
      toImageryMeta({ start_date: "not-a-date", end_date: "2026-06-16" })
    );
    expect(params[0].value).toBe("not-a-date – Jun 16, 2026");
  });
});

describe("imageryLegendInfo", () => {
  it("mentions scene count, target date and attribution", () => {
    expect(imageryLegendInfo(toImageryMeta(fullMeta))).toBe(
      "Sentinel-2 true-colour mosaic built from 9 scenes closest to Jun 15, 2026. Contains modified Copernicus Sentinel data."
    );
  });

  it("singularises one scene and skips missing parts", () => {
    expect(imageryLegendInfo(toImageryMeta({ item_count: 1 }))).toBe(
      "Sentinel-2 true-colour mosaic built from 1 scene. Contains modified Copernicus Sentinel data."
    );
    expect(imageryLegendInfo(toImageryMeta({}))).toBe(
      "Sentinel-2 true-colour mosaic. Contains modified Copernicus Sentinel data."
    );
  });

  it("includes observed mean cloud cover when present", () => {
    expect(
      imageryLegendInfo(toImageryMeta({ mean_cloud_cover: 12.4 }))
    ).toContain("Mean observed cloud cover 12%.");
  });

  it("describes and attributes Planet mosaics, skipping null stats", () => {
    expect(imageryLegendInfo(toImageryMeta(planetMeta))).toBe(
      "Planet monthly true-colour mosaic closest to Jul 1, 2026. Imagery © Planet Labs PBC."
    );
  });
});

describe("provider display", () => {
  it("labels and attributes Sentinel-2 imagery", () => {
    expect(imagerySubtitle("sentinel-2")).toBe("Sentinel-2 · True-colour");
    expect(imageryAttribution("sentinel-2")).toBe(
      "Contains modified Copernicus Sentinel data"
    );
  });

  it("labels and attributes Planet imagery", () => {
    expect(imagerySubtitle("planet")).toBe("Planet · Monthly mosaic");
    expect(imageryAttribution("planet")).toBe("Imagery © Planet Labs PBC");
  });
});

describe("imageryCloudNote", () => {
  it("returns a note above the default cloud limit", () => {
    expect(imageryCloudNote(toImageryMeta({ max_cloud_cover: 50 }))).toBe(
      "Searched with a loosened cloud-cover limit (50%) — imagery may contain clouds."
    );
  });

  it("returns undefined at or below the default, or when unknown", () => {
    expect(
      imageryCloudNote(toImageryMeta({ max_cloud_cover: 20 }))
    ).toBeUndefined();
    expect(
      imageryCloudNote(toImageryMeta({ max_cloud_cover: 10 }))
    ).toBeUndefined();
    expect(imageryCloudNote(toImageryMeta({}))).toBeUndefined();
    expect(
      imageryCloudNote(toImageryMeta({ max_cloud_cover: null }))
    ).toBeUndefined();
  });
});

describe("captureMetaLabel", () => {
  it("combines cloud limit and scene count", () => {
    expect(captureMetaLabel(toImageryMeta(fullMeta))).toBe(
      "cloud <50% · 9 scenes"
    );
    expect(captureMetaLabel(toImageryMeta({ item_count: 1 }))).toBe("1 scene");
    expect(captureMetaLabel(toImageryMeta({ max_cloud_cover: 20 }))).toBe(
      "cloud <20%"
    );
    expect(captureMetaLabel(toImageryMeta({}))).toBe("");
  });

  it("renders nothing for explicit nulls instead of the string 'null'", () => {
    expect(captureMetaLabel(toImageryMeta(planetMeta))).toBe("");
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

describe("isImageryTool", () => {
  it("recognises every imagery provider's tool", () => {
    expect(isImageryTool("show_imagery")).toBe(true);
    expect(isImageryTool("show_planet_imagery")).toBe(true);
  });

  it("rejects other tools and a missing name", () => {
    expect(isImageryTool("pick_dataset")).toBe(false);
    expect(isImageryTool(undefined)).toBe(false);
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
      subtitle: "Sentinel-2 · True-colour",
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

  it("labels the group after the live capture's provider", () => {
    const group = buildImageryGroup(
      [imageryLayer("imagery-planet:2026-07", {}, planetMeta)],
      false
    );
    expect(group?.subtitle).toBe("Planet · Monthly mosaic");
    expect(group?.captures[0].metaLabel).toBe("");
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
