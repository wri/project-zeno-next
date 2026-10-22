import type { AlertsListWire } from "../alerts";

/**
 * A `POST /api/alerts/list` response shaped exactly as project-zeno sends it
 * (PZB-1468) for a request without dates: the 30 days to the dataset's
 * latest alert date (16 Oct) for Guarapuava, rows newest first, the 7 days
 * ending on that date flagged `new`, one day with no high-confidence area
 * and one with no highest. Shared by the API, list and widget tests.
 */
export const ALERTS_LIST_WIRE: AlertsListWire = {
  data_to: "2026-10-16",
  latest_alert_date: "2026-10-16",
  start_date: "2026-09-16",
  end_date: "2026-10-16",
  new_week: { start_date: "2026-10-10", end_date: "2026-10-16" },
  total_area_ha: 105.7,
  rows: [
    {
      alert_date: "2026-10-16",
      high_ha: 4.2,
      highest_ha: 0.8,
      total_ha: 5.0,
      new: true,
    },
    {
      alert_date: "2026-10-15",
      high_ha: 2.1,
      highest_ha: 0,
      total_ha: 2.1,
      new: true,
    },
    {
      alert_date: "2026-10-14",
      high_ha: 0,
      highest_ha: 1.6,
      total_ha: 1.6,
      new: true,
    },
    {
      alert_date: "2026-10-12",
      high_ha: 9.3,
      highest_ha: 2.2,
      total_ha: 11.5,
      new: true,
    },
    {
      alert_date: "2026-10-10",
      high_ha: 12.5,
      highest_ha: 3.0,
      total_ha: 15.5,
      new: true,
    },
    {
      alert_date: "2026-10-09",
      high_ha: 6.4,
      highest_ha: 1.1,
      total_ha: 7.5,
      new: false,
    },
    {
      alert_date: "2026-10-07",
      high_ha: 3.3,
      highest_ha: 0.6,
      total_ha: 3.9,
      new: false,
    },
    {
      alert_date: "2026-10-05",
      high_ha: 18.0,
      highest_ha: 4.4,
      total_ha: 22.4,
      new: false,
    },
    {
      alert_date: "2026-10-04",
      high_ha: 1.2,
      highest_ha: 0.3,
      total_ha: 1.5,
      new: false,
    },
    {
      alert_date: "2026-10-01",
      high_ha: 7.7,
      highest_ha: 2.0,
      total_ha: 9.7,
      new: false,
    },
    {
      alert_date: "2026-09-28",
      high_ha: 5.5,
      highest_ha: 0.9,
      total_ha: 6.4,
      new: false,
    },
    {
      alert_date: "2026-09-24",
      high_ha: 2.8,
      highest_ha: 0.4,
      total_ha: 3.2,
      new: false,
    },
    {
      alert_date: "2026-09-20",
      high_ha: 11.1,
      highest_ha: 3.3,
      total_ha: 14.4,
      new: false,
    },
    {
      alert_date: "2026-09-18",
      high_ha: 0.9,
      highest_ha: 0.1,
      total_ha: 1.0,
      new: false,
    },
  ],
};

export const ALERTS_TILE_URL =
  "https://tiles.globalforestwatch.org/gfw_integrated_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-09-16&end_date=2026-10-16";

/**
 * A `widget_type: "alerts"` config as the `nrt-monitoring` template writes
 * it: the area identity plus the alerts layer snapshot a map widget carries
 * (`widget_configs.dataset_config`).
 */
export const ALERTS_WIDGET_CONFIG: Record<string, unknown> = {
  alerts: {
    aoi: {
      source: "gadm",
      src_id: "BRA.16.137_2",
      subtype: "district-county",
      name: "Guarapuava",
    },
    days: 30,
  },
  dataset: {
    dataset_id: 11,
    dataset_name: "Integrated alerts",
    tile_url: ALERTS_TILE_URL,
    context_layer: null,
    selected_layer: null,
    // The catalogue's SBTN tiles for the Intersects choices; the backend
    // leaves `context_layer` null so nothing is drawn by default.
    context_layers: [
      {
        name: "natural_lands",
        tile_url:
          "https://eoapi.example.org/raster/collections/natural-lands/tiles/{z}/{x}/{y}.png?classes=all",
      },
      {
        name: "natural_forests",
        tile_url:
          "https://eoapi.example.org/raster/collections/natural-lands/tiles/{z}/{x}/{y}.png?classes=forest",
      },
    ],
    parameters: null,
    layers: [{ name: "Integrated alerts", tile_url: ALERTS_TILE_URL }],
    start_date: "2026-09-16",
    end_date: "2026-10-16",
  },
};
