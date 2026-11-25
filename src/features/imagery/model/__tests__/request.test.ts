import { describe, expect, it } from "vitest";
import {
  decodeRecipe,
  defaultRequest,
  encodeRecipe,
  normalizeRequest,
  searchRange,
  shiftIsoDate,
  type Sentinel2Request,
} from "../request";

// Tokens from the backend's encode_recipe (src/api/services/mosaic.py) for
// the same requests, so a capture made here gets the agent's layer id.
const BACKEND_TOKEN_TWO_AREAS =
  "eyJhIjpbWyJnYWRtIiwiUEVSLjExLjNfMSJdLFsia2JhIiwiUGFjYXlhLVNhbWlyaWEgXHUwMGU5Il1dLCJjIjo1MCwiZCI6IjIwMjYtMDYtMTUiLCJuIjo1MCwidyI6MzB9";
const BACKEND_TOKEN_CUSTOM =
  "eyJhIjpbWyJjdXN0b20iLCJhYmMiXV0sImMiOjIwLCJkIjoiMjAyNi0wNi0xNSIsIm4iOjUwLCJ1IjoidS0xIiwidyI6N30";

const twoAreas: Sentinel2Request = {
  aois: [
    { source: "gadm", srcId: "PER.11.3_1" },
    // A non-ASCII id: Python escapes it as é in the token JSON.
    { source: "kba", srcId: "Pacaya-Samiria é" },
  ],
  aoiNames: ["Paracas", "Pacaya-Samiria"],
  targetDate: "2026-06-15",
  windowDays: 30,
  maxCloudCover: 50,
  maxItems: 50,
};

describe("encodeRecipe", () => {
  it("matches the backend token", () => {
    expect(encodeRecipe(twoAreas)).toBe(BACKEND_TOKEN_TWO_AREAS);
  });

  it("includes the custom-area owner", () => {
    expect(
      encodeRecipe({
        aois: [{ source: "custom", srcId: "abc" }],
        aoiNames: ["My area"],
        targetDate: "2026-06-15",
        windowDays: 7,
        maxCloudCover: 20,
        maxItems: 50,
        userId: "u-1",
      })
    ).toBe(BACKEND_TOKEN_CUSTOM);
  });

  it("writes the sort only when it is not the default", () => {
    expect(encodeRecipe({ ...twoAreas, sort: "cloud" })).toBe(
      BACKEND_TOKEN_TWO_AREAS
    );
    const byDate = encodeRecipe({ ...twoAreas, sort: "date" });
    expect(byDate).not.toBe(BACKEND_TOKEN_TWO_AREAS);
    expect(decodeRecipe(byDate)?.sort).toBe("date");
  });

  it("ignores display names", () => {
    expect(encodeRecipe({ ...twoAreas, aoiNames: [] })).toBe(
      BACKEND_TOKEN_TWO_AREAS
    );
  });
});

describe("decodeRecipe", () => {
  it("round-trips a backend token", () => {
    const decoded = decodeRecipe(BACKEND_TOKEN_TWO_AREAS, twoAreas.aoiNames);
    // A backend token has no sort: it decodes to the default.
    expect(decoded).toEqual({ ...twoAreas, sort: "cloud" });
    expect(encodeRecipe(decoded!)).toBe(BACKEND_TOKEN_TWO_AREAS);
  });

  it("accepts an older token with a numeric src_id", () => {
    // encode_recipe for aois=(("wdpa", 555555),): the id is a JSON number.
    const token =
      "eyJhIjpbWyJ3ZHBhIiw1NTU1NTVdXSwiYyI6NTAsImQiOiIyMDI2LTExLTEwIiwibiI6NTAsInciOjd9";
    expect(decodeRecipe(token)?.aois).toEqual([
      { source: "wdpa", srcId: "555555" },
    ]);
  });

  it("keeps the custom-area owner", () => {
    expect(decodeRecipe(BACKEND_TOKEN_CUSTOM)?.userId).toBe("u-1");
  });

  it("returns null for ids that are not recipes", () => {
    expect(decodeRecipe("planet_medres_normalized_analytic_2026-08")).toBe(
      null
    );
    expect(decodeRecipe(btoa(JSON.stringify({ a: [], d: "2026-01-01" })))).toBe(
      null
    );
    expect(decodeRecipe(btoa(JSON.stringify({ a: [["gadm", "X"]] })))).toBe(
      null
    );
  });
});

describe("normalizeRequest", () => {
  it("clamps to the backend limits", () => {
    const r = normalizeRequest({
      ...twoAreas,
      windowDays: 400,
      maxCloudCover: 0,
      maxItems: 500,
    });
    expect([r.windowDays, r.maxCloudCover, r.maxItems]).toEqual([183, 1, 100]);
  });
});

describe("searchRange", () => {
  it("is the target date ± the window", () => {
    expect(searchRange({ ...twoAreas, windowDays: 7 }, "2026-11-25")).toEqual({
      start: "2026-06-08",
      end: "2026-06-22",
    });
  });

  it("ends today at the latest", () => {
    expect(
      searchRange(
        { ...twoAreas, targetDate: "2026-11-20", windowDays: 7 },
        "2026-11-25"
      )
    ).toEqual({ start: "2026-11-13", end: "2026-11-25" });
  });

  it("crosses month and year ends", () => {
    expect(shiftIsoDate("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("defaultRequest", () => {
  it("is the agent's no-date default: the past two weeks, < 50% cloud", () => {
    expect(
      defaultRequest([{ source: "gadm", srcId: "X" }], ["X"], "2026-11-25")
    ).toEqual({
      aois: [{ source: "gadm", srcId: "X" }],
      aoiNames: ["X"],
      targetDate: "2026-11-18",
      windowDays: 7,
      maxCloudCover: 50,
      maxItems: 50,
      sort: "cloud",
    });
  });
});
