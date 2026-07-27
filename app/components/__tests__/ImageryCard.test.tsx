// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImageryCard } from "../ImageryCard";
import type { ImageryCardData } from "@/app/utils/imagery";

const imagery: ImageryCardData = {
  tile_url: "https://tiles.example.com/{z}/{x}/{y}.png",
  tilejson_url: "https://tiles.example.com/tilejson.json",
  mosaic_id: "abc123",
  item_count: 9,
  date_start: "2026-06-12",
  date_end: "2026-06-16",
  target_date: "2026-06-15",
  window_days: 30,
  max_cloud_cover: 50,
  aoi_names: ["Paracas National Reserve"],
  thumbnail_url: "https://tiles.example.com/8/128/128.png",
};

function renderCard(data: ImageryCardData = imagery) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <ImageryCard imagery={data} />
    </ChakraProvider>
  );
}

describe("ImageryCard", () => {
  it("renders the DATA label, title and caption", () => {
    renderCard();

    expect(screen.getByText("DATA")).toBeDefined();
    expect(screen.getByText("Satellite Imagery")).toBeDefined();
    expect(
      screen.getByText("Jun 12–16 · cloud <50% · Sentinel-2")
    ).toBeDefined();
  });

  it("uses the mosaic tile as the thumbnail", () => {
    renderCard();

    const img = screen.getByAltText<HTMLImageElement>("Satellite Imagery");
    expect(img.src).toBe(imagery.thumbnail_url);
  });

  it("falls back to the globe icon without a thumbnail", () => {
    renderCard({ ...imagery, thumbnail_url: undefined });

    expect(screen.queryByAltText("Satellite Imagery")).toBeNull();
    const fallback = document.querySelector('img[src="/globe.svg"]');
    expect(fallback).not.toBeNull();
  });

  it("degrades the caption gracefully on a sparse payload", () => {
    renderCard({
      tile_url: imagery.tile_url,
      tilejson_url: imagery.tilejson_url,
      mosaic_id: "abc123",
      target_date: "2026-06-15",
      aoi_names: [],
    });

    expect(screen.getByText("Jun 15, 2026 · Sentinel-2")).toBeDefined();
  });
});
