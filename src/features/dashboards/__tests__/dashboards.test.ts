import { describe, expect, it } from "vitest";

import {
  AoiSearchResponseSchema,
  DashboardListResponseSchema,
} from "../api/schemas";
import { updatedLabel } from "../lib/dates";

describe("dashboard schemas", () => {
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

describe("dashboard date helpers", () => {
  it("uses a neutral updated label for invalid or future timestamps", () => {
    expect(updatedLabel("not-a-date")).toBe("Updated recently");
    expect(updatedLabel("2999-01-01T00:00:00Z")).toBe("Updated recently");
  });
});
