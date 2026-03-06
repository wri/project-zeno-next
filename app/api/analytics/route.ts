import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GFW Analytics API proxy
//
// Replaces the BE's /api/labs/monitoring/stream endpoint by calling the
// public GFW analytics API directly. Payload shapes match the BE's
// analytics_handler.py `_build_payload` method.
//
// Flow (matches BE's _poll_for_completion + _process_response_data):
// 1. POST payload → { status: "pending"|"success"|"saved", data: { link } }
// 2. If "pending", re-POST same payload until "success"/"saved"
// 3. GET data.link → download result → { data: { result: {...} } }
// ---------------------------------------------------------------------------

const ANALYTICS_BASE = "https://analytics.globalnaturewatch.org";

/** Dataset ID → analytics API endpoint path. */
const ANALYTICS_ENDPOINTS: Record<number, string> = {
  0: "/v0/land_change/dist_alerts/analytics",
  1: "/v0/land_change/land_cover_change/analytics",
  2: "/v0/land_change/grasslands/analytics",
  3: "/v0/land_change/natural_lands/analytics",
  4: "/v0/land_change/tree_cover_loss/analytics",
  5: "/v0/land_change/tree_cover_gain/analytics",
  6: "/v0/land_change/carbon_flux/analytics",
  7: "/v0/land_change/tree_cover/analytics",
  8: "/v0/land_change/tree_cover_loss/analytics",
  9: "/v0/land_change/deforestation_luc_emissions_factor/analytics",
};

// ---------------------------------------------------------------------------
// GADM ID helpers
// ---------------------------------------------------------------------------

/**
 * Strip the "gadm:" prefix from FE area IDs.
 * API expects pattern: ^[A-Z]{3}(\.\d+)*$  e.g. "BRA", "BRA.1"
 */
function formatGadmIds(areaIds: string[]): string[] {
  return areaIds.map((id) => id.replace(/^gadm:/, ""));
}

/** Build the AOI object for GADM admin areas. */
function buildGadmAoi(gadmIds: string[]) {
  return { type: "admin" as const, ids: gadmIds };
}

// ---------------------------------------------------------------------------
// Dataset-specific payload builders
// Mirrors analytics_handler.py _build_payload exactly.
// ---------------------------------------------------------------------------

function buildPayload(
  datasetId: number,
  gadmIds: string[],
  startDate: string,
  endDate: string,
): Record<string, unknown> {
  const aoi = buildGadmAoi(gadmIds);
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);

  switch (datasetId) {
    // DIST-ALERT: start_date, end_date, intersections
    case 0:
      return {
        aoi,
        start_date: startDate,
        end_date: endDate,
        intersections: [],
      };

    // Land cover, Natural Lands: aoi only
    case 1:
    case 3:
      return { aoi };

    // Grasslands: start_year, end_year
    case 2:
      return { aoi, start_year: startYear, end_year: endYear };

    // Tree cover loss: annual data
    case 4:
      return {
        aoi,
        start_year: String(Math.max(2001, Number(startYear))),
        end_year: endYear,
        canopy_cover: 30,
        forest_filter: null,
        intersections: [],
      };

    // Tree cover loss by dominant driver: total over period, grouped by driver
    case 8:
      return {
        aoi,
        start_year: "2001",
        end_year: "2024",
        canopy_cover: 30,
        forest_filter: null,
        intersections: ["driver"],
      };

    // Tree cover gain: 5-year intervals, start_year, end_year, forest_filter
    case 5: {
      const snap = (y: number) => y - (y % 5);
      let sy = snap(Number(startYear));
      let ey = snap(Number(endYear));
      if (sy === ey) ey += 5;
      return {
        aoi,
        start_year: String(Math.max(2000, sy)),
        end_year: String(Math.max(2005, ey)),
        forest_filter: null,
      };
    }

    // Carbon flux: canopy_cover
    case 6:
      return { aoi, canopy_cover: 30 };

    // Tree cover: canopy_cover, forest_filter
    case 7:
      return { aoi, canopy_cover: 30, forest_filter: null };

    // sLUC Emission Factors: gas_types, crop_types, start_year, end_year
    case 9:
      return {
        aoi,
        gas_types: ["CO2e", "CO2", "CH4", "N20"],
        crop_types: [
          "Banana",
          "Barley",
          "Bean",
          "Cassava",
          "Chickpea",
          "Coconut",
          "Cocoa",
          "Arabica Coffee",
          "Robusta Coffee",
          "Cotton",
          "Cowpea",
          "Groundnut",
          "Lentil",
          "Maize",
          "Pearl Millet",
          "Small Millet",
          "Oil Palm",
          "Pigeon Pea",
          "Plantain",
          "Potato",
          "Rapeseed",
          "Rice",
          "Sesame Seed",
          "Sorghum",
          "Soybean",
          "Sugarbeet",
          "Sugarcane",
          "Sunflower",
          "Sweet Potato",
          "Tea",
          "Tobacco",
          "Wheat",
          "Yams",
          "Other Cereals",
          "Other Fibre Crops",
          "Other Oil Crops",
          "Other Pulses",
          "Other Roots",
          "Rest of Crops",
          "Temperate Fruit",
          "Tropical Fruit",
          "Vegetables",
        ],
        start_year: String(Math.max(2020, Number(startYear))),
        end_year: String(Math.min(2024, Number(endYear))),
      };

    default:
      return { aoi };
  }
}

// ---------------------------------------------------------------------------
// Fetch + poll + download
// ---------------------------------------------------------------------------

const MAX_POLL_RETRIES = 10;
const POLL_INTERVAL_MS = 500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 1. POST payload → get status
 * 2. If "pending", re-POST same payload (poll) until "success"/"saved"
 * 3. GET data.link → download the result
 * 4. Return data.result from the download
 */
async function fetchAnalytics(
  endpoint: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const url = `${ANALYTICS_BASE}${endpoint}`;
  const headers = { "Content-Type": "application/json" };
  const body = JSON.stringify(payload);

  // Step 1: Initial POST
  let response = await fetch(url, { method: "POST", headers, body, signal });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Analytics API error (${response.status}): ${text}`);
  }

  let result = await response.json();

  // Step 2: Poll by re-POSTing if status is "pending"
  for (let attempt = 1; attempt <= MAX_POLL_RETRIES; attempt++) {
    const status = result?.status;

    if (status === "success" || status === "saved") break;

    if (status === "failed" || status === "error") {
      throw new Error(
        `Analytics API failed: ${result?.message || JSON.stringify(result)}`,
      );
    }

    if (status !== "pending") break;

    // Backoff: 0.5s * attempt (matches BE: poll_interval * (attempt + 1))
    await sleep(POLL_INTERVAL_MS * (attempt + 1));

    console.log(`[analytics] Poll attempt ${attempt}/${MAX_POLL_RETRIES}`);

    response = await fetch(url, { method: "POST", headers, body, signal });

    if (!response.ok) {
      console.warn(
        `[analytics] Poll attempt ${attempt} failed: ${response.status}`,
      );
      continue;
    }

    result = await response.json();
  }

  // Step 3: Download the result from data.link
  const link = result?.data?.link;
  if (!link || typeof link !== "string") {
    throw new Error(`No download link in response: ${JSON.stringify(result)}`);
  }

  const downloadResponse = await fetch(link, { signal });
  if (!downloadResponse.ok) {
    throw new Error(`Data download error (${downloadResponse.status})`);
  }

  const downloaded = await downloadResponse.json();

  // The download response is { data: { result: { ...columnar data... } } }
  const rawResult = downloaded?.data?.result;
  if (!rawResult) {
    throw new Error(
      `Download response missing data.result: ${JSON.stringify(downloaded).slice(0, 200)}`,
    );
  }

  return rawResult;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

interface AnalyticsRequestBody {
  dataset_id: number;
  area_ids: string[];
  start_date: string;
  end_date: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsRequestBody = await request.json();
    const { dataset_id, area_ids, start_date, end_date } = body;

    const endpoint = ANALYTICS_ENDPOINTS[dataset_id];
    if (!endpoint) {
      return NextResponse.json(
        { error: `Unknown dataset_id: ${dataset_id}` },
        { status: 400 },
      );
    }

    if (!area_ids?.length) {
      return NextResponse.json(
        { error: "area_ids is required and must not be empty" },
        { status: 400 },
      );
    }

    const gadmIds = formatGadmIds(area_ids);
    const payload = buildPayload(dataset_id, gadmIds, start_date, end_date);

    console.log(`[analytics] dataset=${dataset_id} areas=${gadmIds.join(",")}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      const data = await fetchAnalytics(endpoint, payload, controller.signal);
      clearTimeout(timeoutId);
      return NextResponse.json({ status: "success", data });
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        return NextResponse.json(
          { error: "Request timed out" },
          { status: 504 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("[analytics] Proxy error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 },
    );
  }
}
