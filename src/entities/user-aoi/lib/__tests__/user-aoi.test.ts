import { describe, expect, it } from "vitest";

import type { UserAoi } from "../../model/user-aoi";
import { isUserAoi, userAoiToAoi } from "../user-aoi";

const saved: UserAoi = {
  id: "entry-1",
  relationship: "saved",
  name: "Project country",
  source: "gadm",
  src_id: "BRA",
  subtype: "country",
  bbox: [-74, -34, -34, 5],
  created_at: "2026-11-24T00:00:00",
};

describe("userAoiToAoi", () => {
  it("addresses a saved area by its own source, not as a custom area", () => {
    expect(userAoiToAoi(saved)).toEqual({
      name: "Project country",
      source: "gadm",
      src_id: "BRA",
      subtype: "country",
      bbox: [-74, -34, -34, 5],
    });
  });

  it("leaves out a missing bbox", () => {
    expect(userAoiToAoi({ ...saved, bbox: null })).not.toHaveProperty("bbox");
  });
});

describe("isUserAoi", () => {
  // Map layers name a source by its layer id ("GADM"), the API in lowercase.
  it("matches an area whatever the source's casing", () => {
    expect(isUserAoi([saved], "GADM", "BRA")).toBe(true);
  });

  it("does not match another area of the same source", () => {
    expect(isUserAoi([saved], "gadm", "ARG")).toBe(false);
  });
});
