import { describe, expect, it } from "vitest";

import type { Dashboard } from "../../api/schemas";
import { findDashboardForArea } from "../find-dashboard-for-area";

interface AoiOverrides {
  source?: string;
  src_id?: string;
  name?: string;
}

function dashboard(
  id: string,
  aoi: AoiOverrides,
  updatedAt = "2026-01-01T00:00:00Z"
): Dashboard {
  return {
    id,
    user_id: "user-1",
    name: aoi.name ?? "Dashboard",
    is_public: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: updatedAt,
    aois: [
      {
        id: `${id}-aoi`,
        position: 0,
        source: aoi.source ?? "gadm",
        src_id: aoi.src_id ?? "BRA.16_1",
        subtype: "state-province",
        name: aoi.name ?? "Paraná, Brazil",
      },
    ],
    widgets: [],
  };
}

const parana = {
  source: "gadm",
  srcId: "BRA.16_1",
  name: "Paraná, Brazil",
};

describe("findDashboardForArea", () => {
  it("returns null for an empty list", () => {
    expect(findDashboardForArea([], parana)).toBeNull();
  });

  it("matches on source + src_id", () => {
    const match = dashboard("d1", {});
    const other = dashboard("d2", { src_id: "BRA.1_1", name: "Acre, Brazil" });

    expect(findDashboardForArea([other, match], parana)?.id).toBe("d1");
  });

  it("falls back to a case-insensitive name match when the id differs", () => {
    const renamed = dashboard("d1", {
      src_id: "stale-id",
      name: "PARANÁ, BRAZIL",
    });

    expect(findDashboardForArea([renamed], parana)?.id).toBe("d1");
  });

  it("does not match a different source that shares the name", () => {
    const protectedArea = dashboard("d1", {
      source: "wdpa",
      src_id: "555",
    });

    expect(findDashboardForArea([protectedArea], parana)).toBeNull();
  });

  it("does not match a different area of the same source", () => {
    const acre = dashboard("d1", { src_id: "BRA.1_1", name: "Acre, Brazil" });

    expect(findDashboardForArea([acre], parana)).toBeNull();
  });

  it("prefers an id match over a more recently updated name match", () => {
    const byName = dashboard(
      "name",
      { src_id: "stale" },
      "2026-06-01T00:00:00Z"
    );
    const byId = dashboard("id", {}, "2026-01-01T00:00:00Z");

    expect(findDashboardForArea([byName, byId], parana)?.id).toBe("id");
  });

  it("breaks ties on the most recently updated dashboard", () => {
    const older = dashboard("older", {}, "2026-01-01T00:00:00Z");
    const newer = dashboard("newer", {}, "2026-07-01T00:00:00Z");

    expect(findDashboardForArea([older, newer], parana)?.id).toBe("newer");
    expect(findDashboardForArea([newer, older], parana)?.id).toBe("newer");
  });

  it("still returns a match when its timestamp is unparseable", () => {
    const broken = dashboard("broken", {}, "not-a-date");

    expect(findDashboardForArea([broken], parana)?.id).toBe("broken");
  });

  it("ignores an empty srcId and matches on name alone", () => {
    const match = dashboard("d1", {});

    expect(findDashboardForArea([match], { ...parana, srcId: "" })?.id).toBe(
      "d1"
    );
  });
});
