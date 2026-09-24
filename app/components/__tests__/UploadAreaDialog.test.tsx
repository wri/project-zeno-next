// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { apiFetch } from "@/app/lib/api-client";
import useMapStore from "@/app/store/mapStore";
import UploadAreaDialog from "../UploadAreaDialog";

const mockedFetch = vi.mocked(apiFetch);

const ring = (x: number) => [
  [
    [x, 10],
    [x, 10.5],
    [x + 0.5, 10.5],
    [x + 0.5, 10],
    [x, 10],
  ],
];

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <UploadAreaDialog />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

describe("UploadAreaDialog (map)", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    useMapStore.setState({ dialogVisible: true, layers: [] });
  });

  // Regression: the map's old inline validator kept only plain Polygons after
  // the area check, so a MultiPolygon-only file failed with "No valid Polygon
  // features found".
  it("uploads MultiPolygon-only GeoJSON and adds it to the map", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "a1",
          name: "Hidden Valley",
          geometries: [{ type: "Polygon", coordinates: ring(30) }],
          created_at: "",
          updated_at: "",
        }),
        { status: 200 }
      )
    );
    renderDialog();

    const multi = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "MultiPolygon", coordinates: [ring(30), ring(31)] },
        },
      ],
    };
    fireEvent.change(screen.getByLabelText("Area file"), {
      target: { files: [new File([JSON.stringify(multi)], "area.geojson")] },
    });
    await screen.findByText(/area\.geojson/);
    fireEvent.click(screen.getByRole("button", { name: /upload$/i }));

    await waitFor(() =>
      expect(useMapStore.getState().layers.map((l) => l.id)).toContain("a1")
    );
    const body = JSON.parse(mockedFetch.mock.calls[0][1]?.body as string);
    expect(body.geometries).toEqual([
      { type: "Polygon", coordinates: ring(30) },
      { type: "Polygon", coordinates: ring(31) },
    ]);
    expect(useMapStore.getState().dialogVisible).toBe(false);
  });
});
