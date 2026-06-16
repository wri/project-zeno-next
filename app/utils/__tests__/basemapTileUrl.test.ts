import { describe, it, expect } from "vitest";
import { buildBasemapTileUrl } from "../basemapTileUrl";

describe("buildBasemapTileUrl", () => {
  it("builds a 1x tile URL when pixel ratio is 1", () => {
    expect(buildBasemapTileUrl("devseed/abc123", "token", 1)).toBe(
      "https://api.mapbox.com/styles/v1/devseed/abc123/tiles/{z}/{x}/{y}?access_token=token"
    );
  });

  it("requests @2x tiles when pixel ratio is greater than 1", () => {
    expect(buildBasemapTileUrl("devseed/abc123", "token", 2)).toBe(
      "https://api.mapbox.com/styles/v1/devseed/abc123/tiles/{z}/{x}/{y}@2x?access_token=token"
    );
  });

  it("requests @2x tiles for fractional pixel ratios above 1", () => {
    expect(buildBasemapTileUrl("devseed/abc123", "token", 1.5)).toContain(
      "{z}/{x}/{y}@2x?"
    );
  });

  it("omits the access_token query param when no token is provided", () => {
    expect(buildBasemapTileUrl("devseed/abc123", undefined, 1)).toBe(
      "https://api.mapbox.com/styles/v1/devseed/abc123/tiles/{z}/{x}/{y}"
    );
  });

  it("URL-encodes the access token", () => {
    expect(buildBasemapTileUrl("devseed/abc123", "a b&c", 1)).toBe(
      "https://api.mapbox.com/styles/v1/devseed/abc123/tiles/{z}/{x}/{y}?access_token=a%20b%26c"
    );
  });
});
