import { describe, expect, it } from "vitest";

import { placeMeta, placeToAoi } from "../place";

const hit = (over: Partial<Parameters<typeof placeMeta>[0]>) => ({
  source: "gadm",
  src_id: "ARG.21_1",
  name: "Santa Cruz",
  subtype: "state-province",
  ...over,
});

describe("placeMeta", () => {
  // Two GADM places named "Santa Cruz" differ only by country.
  it("adds the country code to a GADM hit", () => {
    expect(placeMeta(hit({}))).toBe("State or province · ARG");
    expect(placeMeta(hit({ src_id: "BOL.8_1" }))).toBe(
      "State or province · BOL"
    );
    expect(
      placeMeta(hit({ src_id: "ESP.14.2_1", subtype: "district-county" }))
    ).toBe("District or county · ESP");
  });

  it("says only Country for a country", () => {
    expect(placeMeta(hit({ src_id: "BRA", subtype: "country" }))).toBe(
      "Country"
    );
  });

  it("words an unknown GADM level", () => {
    expect(placeMeta(hit({ subtype: "ward_level" }))).toBe("Ward level · ARG");
  });

  it("names the set for other sources", () => {
    expect(placeMeta(hit({ source: "wdpa", src_id: "555512" }))).toBe(
      "Protected area"
    );
    expect(placeMeta(hit({ source: "kba", src_id: "14321" }))).toBe(
      "Key biodiversity area"
    );
  });
});

describe("placeToAoi", () => {
  it("keeps a four-number bbox and drops any other", () => {
    expect(placeToAoi(hit({ bbox: [1, 2, 3, 4] })).bbox).toEqual([1, 2, 3, 4]);
    expect(placeToAoi(hit({ bbox: [1, 2] }))).not.toHaveProperty("bbox");
    expect(placeToAoi(hit({}))).not.toHaveProperty("bbox");
  });
});
