import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import {
  ALERTS_SUMMARY_MAX_IDS,
  addSection,
  addTextWidget,
  applyAnalysisTemplate,
  fetchDashboardAlertsSummary,
} from "../api/dashboards";
import {
  DashboardListResponseSchema,
  DashboardSectionResponseSchema,
} from "../api/schemas";
import {
  AoiSearchResponseSchema,
  subtypeLabel,
  type AoiSearchResult,
} from "@/src/entities/aoi";
import { aoiToDashboardCreateRequest, sourceLabel } from "../lib/aoi";
import { updatedLabel, updatedOnLabel, wasJustCreated } from "../lib/dates";

describe("dashboard schemas", () => {
  it("settles a section's template to null whether the BE sends null or omits it", () => {
    const base = {
      id: "s1",
      title: "Fires",
      position: 0,
      created_at: "2026-09-01T00:00:00Z",
    };
    expect(DashboardSectionResponseSchema.parse(base).template).toBeNull();
    expect(
      DashboardSectionResponseSchema.parse({ ...base, template: null }).template
    ).toBeNull();
    expect(
      DashboardSectionResponseSchema.parse({
        ...base,
        template: {
          name: "nrt-monitoring",
          args: { days: 14 },
          start_date: "2026-09-11",
          end_date: "2026-09-25",
          built_at: "2026-09-25T10:00:00Z",
        },
      }).template?.name
    ).toBe("nrt-monitoring");
  });

  it("parses AOI search results returned by the staging API", () => {
    const results = AoiSearchResponseSchema.parse([
      {
        source: "gadm",
        src_id: "BRA.18_1",
        name: "Paraná",
        subtype: "state-province",
        bbox: [-54.62, -26.72, -48.02, -22.51],
      },
    ]);

    expect(results[0]).toMatchObject({
      source: "gadm",
      src_id: "BRA.18_1",
      name: "Paraná",
      subtype: "state-province",
    });
  });

  it("does not invent a world bbox when the API omits bbox", () => {
    const results = AoiSearchResponseSchema.parse([
      {
        source: "gadm",
        src_id: "BRA.18_1",
        name: "Paraná",
        subtype: "state-province",
      },
    ]);

    expect(results[0].bbox).toBeUndefined();
  });

  it("parses empty dashboards with AOIs and no widgets", () => {
    const dashboards = DashboardListResponseSchema.parse([
      {
        id: "dash-1",
        user_id: "user-1",
        name: "Paraná",
        description: null,
        is_public: false,
        created_at: "2026-07-08T00:00:00Z",
        updated_at: "2026-07-08T00:00:00Z",
        aois: [
          {
            id: "aoi-1",
            source: "gadm",
            src_id: "BRA.18_1",
            subtype: "state-province",
            name: "Paraná",
            position: 0,
          },
        ],
        widgets: [],
      },
    ]);

    expect(dashboards[0].widgets).toEqual([]);
    expect(dashboards[0].aois[0].name).toBe("Paraná");
  });
});

describe("dashboard AOI helpers", () => {
  const parana: AoiSearchResult = {
    source: "gadm",
    src_id: "BRA.18_1",
    name: "Paraná",
    subtype: "state-province",
    bbox: [-54.62, -26.72, -48.02, -22.51],
  };

  it("maps an AOI search result to the create-dashboard payload", () => {
    expect(aoiToDashboardCreateRequest(parana)).toEqual({
      name: "Paraná",
      aois: [
        {
          source: "gadm",
          src_id: "BRA.18_1",
          subtype: "state-province",
          name: "Paraná",
        },
      ],
    });
  });

  it("formats source and subtype labels for the table", () => {
    expect(sourceLabel("gadm")).toBe("Administrative areas");
    expect(sourceLabel("wdpa")).toBe("Protected areas");
    expect(subtypeLabel("state-province")).toBe("State province");
  });
});

describe("dashboard date helpers", () => {
  it("uses a neutral updated label for invalid or future timestamps", () => {
    expect(updatedLabel("not-a-date")).toBe("Updated recently");
    expect(updatedLabel("2999-01-01T00:00:00Z")).toBe("Updated recently");
  });

  it("dates the export with a calendar date", () => {
    // Midday UTC, so the calendar day is the same in any test runner's zone.
    expect(updatedOnLabel("2026-07-01T12:00:00Z")).toBe("Updated 1 July 2026");
    expect(updatedOnLabel("not-a-date")).toBe("Updated recently");
  });

  it("treats a dashboard as just created within the 10-minute window", () => {
    const now = new Date("2026-08-13T12:00:00Z").getTime();
    expect(wasJustCreated("2026-08-13T11:59:00Z", now)).toBe(true);
    expect(wasJustCreated("2026-08-13T12:00:00Z", now)).toBe(true);
  });

  it("stops treating a dashboard as just created once the window elapses", () => {
    const now = new Date("2026-08-13T12:00:00Z").getTime();
    expect(wasJustCreated("2026-08-13T11:49:00Z", now)).toBe(false);
  });

  it("rejects invalid or future creation timestamps", () => {
    const now = new Date("2026-08-13T12:00:00Z").getTime();
    expect(wasJustCreated("not-a-date", now)).toBe(false);
    expect(wasJustCreated("2026-08-13T12:01:00Z", now)).toBe(false);
  });
});

describe("addTextWidget", () => {
  it("sends config.text as a string, per the backend's validate_text_config", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await addTextWidget("d1");

    expect(apiFetch).toHaveBeenCalledWith("/api/dashboards/d1/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widget_type: "text", config: { text: "" } }),
    });
  });
});

const DASHBOARD_BODY = {
  id: "d1",
  user_id: "u1",
  name: "Paraná",
  is_public: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("addSection", () => {
  it("posts the title and returns the dashboard's sections", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ...DASHBOARD_BODY,
          sections: [
            {
              id: "s1",
              title: "New section",
              position: 0,
              created_at: "2026-09-01T00:00:00Z",
            },
          ],
        }),
        { status: 201 }
      )
    );

    const dashboard = await addSection("d1", "New section");

    expect(apiFetch).toHaveBeenCalledWith("/api/dashboards/d1/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New section" }),
    });
    expect(dashboard.sections.map((s) => s.id)).toEqual(["s1"]);
  });
});

describe("applyAnalysisTemplate", () => {
  it("posts the template with empty args by default, so the backend fills in the defaults", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          section_id: "s1",
          widget_ids: ["w1", "w2"],
          warnings: ["No cloud-free imagery in the period."],
          dashboard: DASHBOARD_BODY,
        }),
        { status: 201 }
      )
    );

    const result = await applyAnalysisTemplate("d1", "nrt-monitoring");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/dashboards/d1/sections/from-template",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "nrt-monitoring", args: {} }),
      }
    );
    expect(result.section_id).toBe("s1");
    expect(result.warnings).toEqual(["No cloud-free imagery in the period."]);
    expect(result.dashboard.id).toBe("d1");
  });

  it("carries the status of a failed request, so the caller can name the cause", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: "analytics pull failed" }), {
        status: 502,
      })
    );

    const error = await applyAnalysisTemplate("d1", "nrt-monitoring").catch(
      (e: unknown) => e
    );

    expect((error as { status?: number }).status).toBe(502);
  });
});

describe("fetchDashboardAlertsSummary", () => {
  const week = { start_date: "2026-10-05", end_date: "2026-10-11" };

  // The mock is shared by the whole file and never reset, so call counts
  // would otherwise carry over from the earlier describes.
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("posts the ids and settles the response: only areas with alerts survive", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ...week,
          dashboards: {
            d1: { integrated_alerts: 1457.83, errors: {} },
            d2: {
              integrated_alerts: null,
              errors: { integrated_alerts: "unavailable" },
            },
          },
        }),
        { status: 200 }
      )
    );

    const summary = await fetchDashboardAlertsSummary(["d1", "d2", "d3"]);

    expect(apiFetch).toHaveBeenCalledWith("/api/dashboards/alerts-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dashboard_ids: ["d1", "d2", "d3"] }),
    });
    expect(summary).toEqual({
      startDate: "2026-10-05",
      endDate: "2026-10-11",
      assessedCount: 1,
      newAlertAreaHa: { d1: 1457.83 },
    });
  });

  it("splits a list past the backend's 50-id cap and merges the responses", async () => {
    const ids = Array.from(
      { length: ALERTS_SUMMARY_MAX_IDS + 1 },
      (_, i) => `d${i}`
    );
    const respond = (chunk: string[]) =>
      new Response(
        JSON.stringify({
          ...week,
          dashboards: Object.fromEntries(
            chunk.map((id) => [id, { integrated_alerts: 1, errors: {} }])
          ),
        }),
        { status: 200 }
      );
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(respond(ids.slice(0, ALERTS_SUMMARY_MAX_IDS)))
      .mockResolvedValueOnce(respond(ids.slice(ALERTS_SUMMARY_MAX_IDS)));

    const summary = await fetchDashboardAlertsSummary(ids);

    const sentIds = vi
      .mocked(apiFetch)
      .mock.calls.map(
        ([, init]) =>
          (JSON.parse(String(init?.body)) as { dashboard_ids: string[] })
            .dashboard_ids
      );
    expect(sentIds.map((chunk) => chunk.length)).toEqual([
      ALERTS_SUMMARY_MAX_IDS,
      1,
    ]);
    expect(sentIds.flat()).toEqual(ids);
    expect(summary.assessedCount).toBe(ids.length);
    expect(summary.endDate).toBe("2026-10-11");
  });

  it("asks for the first response's week in every later request", async () => {
    const ids = Array.from(
      { length: ALERTS_SUMMARY_MAX_IDS * 2 + 1 },
      (_, i) => `d${i}`
    );
    // The later responses claim another week, as a request that fell back to
    // the calendar week would; the summary must still carry the first one.
    const respond = (dates: typeof week) =>
      new Response(JSON.stringify({ ...dates, dashboards: {} }), {
        status: 200,
      });
    // A fresh Response per call: a body can only be read once.
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(respond(week))
      .mockImplementation(async () =>
        respond({ start_date: "2026-10-04", end_date: "2026-10-10" })
      );

    const summary = await fetchDashboardAlertsSummary(ids);

    const bodies = vi
      .mocked(apiFetch)
      .mock.calls.map(
        ([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>
      );
    expect(bodies).toHaveLength(3);
    expect(bodies[0]).not.toHaveProperty("start_date");
    expect(bodies[0]).not.toHaveProperty("end_date");
    for (const body of bodies.slice(1)) {
      expect(body).toMatchObject(week);
    }
    expect(summary.startDate).toBe(week.start_date);
    expect(summary.endDate).toBe(week.end_date);
  });

  it("refuses an empty list rather than sending a request the backend rejects", async () => {
    await expect(fetchDashboardAlertsSummary([])).rejects.toThrow(
      /at least one id/
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
