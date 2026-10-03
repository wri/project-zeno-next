import type { PlanetImagery, Sentinel2Imagery } from "@/app/types/chat";

/**
 * Imagery wire contract payloads (wri/project-zeno#844). The defaults are
 * the examples in the backend's docs/imagery/wire-contract-schema.md. A test
 * overrides every field it asserts, with a value that differs from the
 * default, so a reader that ignores the payload can't pass by accident.
 */
export function sentinel2Imagery(
  overrides: Partial<Sentinel2Imagery> = {}
): Sentinel2Imagery {
  return {
    provider: "sentinel-2",
    period: { start: "2026-09-18", end: "2026-09-29" },
    aoi_names: ["Vaud"],
    layer_id: "eyJhIjpbWyJnYWRtIiwiQ0hFLjI2XzEiXV0",
    source: {
      tiles: [
        "https://tiles.globalforestwatch.org/cog/mosaic/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=s3",
      ],
      bounds: [6.0, 46.2, 7.2, 46.9],
      minzoom: 8,
      maxzoom: 14,
    },
    mosaic_id: "eyJhIjpbWyJnYWRtIiwiQ0hFLjI2XzEiXV0",
    max_cloud_cover: 20,
    scenes: {
      item_count: 6,
      start_date: "2026-09-19",
      end_date: "2026-09-28",
      mean_cloud_cover: 7.35,
      min_cloud_cover: 2.1,
      max_cloud_cover: 14.8,
    },
    ...overrides,
  };
}

export function planetImagery(
  overrides: Partial<PlanetImagery> = {}
): PlanetImagery {
  return {
    provider: "planet",
    period: { start: "2026-08-01", end: "2026-08-31" },
    aoi_names: ["Novo Progresso"],
    layer_id: "bbddba21393743b3",
    source: {
      tiles: [
        "https://tiles.globalforestwatch.org/integrated_alerts_planet_imagery/{z}/{x}/{y}.png?month=2026-08",
      ],
      bounds: [-56.0, -8.0, -54.0, -6.0],
      minzoom: 10,
      maxzoom: 18,
    },
    ...overrides,
  };
}
