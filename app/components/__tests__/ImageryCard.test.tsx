// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ImageryCard } from "../ImageryCard";
import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import type { ImageryCardData } from "@/app/utils/imagery";

const card: ImageryCardData = {
  provider: "sentinel-2",
  render: "client",
  mosaic_id: "tok",
  target_date: "2026-06-15",
  window_days: 7,
  max_cloud_cover: 50,
  aoi_names: ["Paracas"],
};

const request = {
  aois: [{ source: "gadm", srcId: "X" }],
  aoiNames: ["Paracas"],
  targetDate: "2026-06-15",
  windowDays: 7,
  maxCloudCover: 50,
  maxItems: 50,
};

function captureLayer(patch: Partial<Layer>): Layer {
  return {
    id: "imagery-tok",
    name: "Satellite Imagery",
    type: "raster",
    visible: true,
    imagery: card,
    ...patch,
  };
}

const renderCard = () =>
  render(
    <ChakraProvider value={defaultSystem}>
      <ImageryCard imagery={card} />
    </ChakraProvider>
  );

describe("ImageryCard", () => {
  beforeEach(() => {
    useMapStore.setState({ layers: [] });
  });

  it("shows the request when the capture is not on the map", () => {
    renderCard();
    expect(screen.getByText("DATA")).toBeTruthy();
    expect(screen.getByText("Satellite Imagery")).toBeTruthy();
    expect(
      screen.getByText("Jun 15, 2026 · cloud <50% · Sentinel-2")
    ).toBeTruthy();
  });

  it("follows the capture's search", () => {
    useMapStore.setState({
      layers: [
        captureLayer({
          sentinel2: { request, status: "searching", scenes: [] },
        }),
      ],
    });
    renderCard();
    expect(
      screen.getByText("Searching scenes… · cloud <50% · Sentinel-2")
    ).toBeTruthy();
  });

  it("shows the acquired dates and the best scene's preview", () => {
    useMapStore.setState({
      layers: [
        captureLayer({
          imagery: {
            ...card,
            start_date: "2026-06-12",
            end_date: "2026-06-16",
          },
          sentinel2: {
            request,
            status: "ok",
            scenes: [
              {
                id: "s",
                bbox: [0, 0, 1, 1],
                datetime: "2026-06-12T15:00:00Z",
                cloudCover: 2,
                gridCode: "MGRS-18LTM",
                visualHref: "https://cogs/TCI.tif",
                thumbnailHref: "https://cogs/preview.jpg",
                rank: 0,
              },
            ],
          },
        }),
      ],
    });
    renderCard();
    expect(
      screen.getByText("Jun 12–16 · cloud <50% · Sentinel-2")
    ).toBeTruthy();
    expect(
      (screen.getByAltText("Satellite imagery") as HTMLImageElement).src
    ).toBe("https://cogs/preview.jpg");
  });

  it("shows a newer capture of the same area when its own found nothing", () => {
    useMapStore.setState({
      layers: [
        // Newer (on top): the user's quick fix, with imagery.
        captureLayer({
          id: "imagery-fixed",
          imagery: {
            ...card,
            mosaic_id: "fixed",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            max_cloud_cover: 80,
          },
          sentinel2: {
            request: { ...request, maxCloudCover: 80 },
            status: "ok",
            scenes: [
              {
                id: "s",
                bbox: [0, 0, 1, 1],
                datetime: "2026-06-01T15:00:00Z",
                cloudCover: 60,
                gridCode: "MGRS-18LTM",
                visualHref: "https://cogs/TCI.tif",
                thumbnailHref: "https://cogs/fixed.jpg",
                rank: 0,
              },
            ],
          },
        }),
        // The card's own capture: no scenes.
        captureLayer({
          sentinel2: { request, status: "no_scenes", scenes: [] },
        }),
      ],
    });
    renderCard();
    expect(screen.getByText("Jun 1–3 · cloud <80% · Sentinel-2")).toBeTruthy();
    expect(
      (screen.getByAltText("Satellite imagery") as HTMLImageElement).src
    ).toBe("https://cogs/fixed.jpg");
  });

  it("keeps showing 'no scenes' when nothing newer has imagery", () => {
    useMapStore.setState({
      layers: [
        captureLayer({
          sentinel2: { request, status: "no_scenes", scenes: [] },
        }),
      ],
    });
    renderCard();
    expect(
      screen.getByText("No scenes found · cloud <50% · Sentinel-2")
    ).toBeTruthy();
  });
});
