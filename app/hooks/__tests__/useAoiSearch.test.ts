import { describe, expect, it } from "vitest";

import { buildAoiSearchParams } from "@/app/hooks/useAoiSearch";
import { isPlaceholderBbox } from "@/app/schemas/api/aois/get";

describe("buildAoiSearchParams", () => {
  it("repeats the source key instead of comma-joining", () => {
    const params = buildAoiSearchParams("para", ["gadm", "kba"], 50);
    expect(params.toString()).toBe("name=para&source=gadm&source=kba&limit=50");
  });

  it("omits name in browse mode and trims whitespace", () => {
    expect(buildAoiSearchParams("  ", [], 25).toString()).toBe("limit=25");
    expect(buildAoiSearchParams(" pará ", [], 25).get("name")).toBe("pará");
  });
});

describe("isPlaceholderBbox", () => {
  it("treats the world extent and missing bboxes as placeholders", () => {
    expect(isPlaceholderBbox([-180, -90, 180, 90])).toBe(true);
    expect(isPlaceholderBbox(null)).toBe(true);
    expect(isPlaceholderBbox(undefined)).toBe(true);
  });

  it("keeps real extents", () => {
    expect(isPlaceholderBbox([-54.6, -26.7, -48.0, -22.5])).toBe(false);
  });
});
