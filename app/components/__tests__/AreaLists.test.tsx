// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Feature } from "geojson";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The thumbnail and the actions menu fetch on their own; neither locates.
vi.mock("../UserAoiThumbnail", () => ({ UserAoiThumbnail: () => null }));
vi.mock("../UserAoiActionsMenu", () => ({ default: () => null }));

import { customAreaRef } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import type { UserAoi } from "@/src/entities/user-aoi";

import { MonitoredAreaCard } from "../AreaLists";

const farm: UserAoi = {
  id: "user-aoi-1",
  relationship: "owner",
  name: "Farm plot",
  source: "custom",
  src_id: "ca-1",
  subtype: "custom-area",
  bbox: null,
  created_at: "2026-11-24T00:00:00",
};

const farmFeature: Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
};

describe("MonitoredAreaCard", () => {
  beforeEach(() => {
    const ref = customAreaRef({ id: farm.src_id, name: farm.name });
    useMapStore.setState({
      layers: [
        {
          id: farm.src_id,
          name: farm.name,
          type: "geojson",
          visible: true,
          featureRefs: [ref],
        },
      ],
      geoJsonRegistry: [{ ref, data: farmFeature, srcId: farm.src_id }],
    });
  });

  it("centres on the area's geometry when it has no bbox", () => {
    const flyToGeoJson = vi.fn();
    useMapStore.setState({ flyToGeoJson });
    render(
      <ChakraProvider value={defaultSystem}>
        <MonitoredAreaCard userAoi={farm} />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Center on map" }));

    expect(flyToGeoJson).toHaveBeenCalledWith(farmFeature);
  });
});
