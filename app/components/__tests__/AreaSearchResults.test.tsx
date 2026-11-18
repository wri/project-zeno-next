// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
// layerManagerSlice lazily imports chatStore to fold layer changes into the
// sent context; stub it so that import can't outlive the test environment.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import { apiFetch } from "@/app/lib/api-client";
import { findRegistryEntry } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import { useSelectionStore } from "@/src/features/analysis";

import { AreaSearchResults } from "../AreaSearchResults";

const mockedFetch = vi.mocked(apiFetch);

const PLACES = [
  {
    source: "gadm",
    src_id: "ARG.21_1",
    name: "Santa Cruz",
    subtype: "state-province",
    bbox: [-73.6, -52.4, -65.7, -45.9],
  },
  {
    source: "gadm",
    src_id: "BOL.8_1",
    name: "Santa Cruz",
    subtype: "state-province",
    bbox: [-64.8, -20.5, -57.5, -13.4],
  },
  {
    source: "wdpa",
    src_id: "555512",
    name: "Reserva Santa Cruz",
    subtype: "protected-area",
  },
];

const SAVED = [
  {
    id: "ca-1",
    user_id: "u1",
    name: "Santa Cruz plots",
    geometries: [
      {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    ],
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

let aoiStatus = 200;

function routeRequests() {
  mockedFetch.mockImplementation(async (path: string) => {
    const url = new URL(path, "http://x");
    if (url.pathname === "/api/aois") {
      if (aoiStatus !== 200) return json({ detail: "boom" }, aoiStatus);
      const sources = url.searchParams.getAll("source");
      const name = (url.searchParams.get("name") ?? "").toLowerCase();
      return json(
        PLACES.filter(
          (p) =>
            sources.includes(p.source) && p.name.toLowerCase().includes(name)
        )
      );
    }
    if (url.pathname === "/api/custom_areas") return json(SAVED);
    if (url.pathname.startsWith("/api/geometry/")) {
      return json({ geometry: { type: "FeatureCollection", features: [] } });
    }
    throw new Error(`Unexpected request: ${path}`);
  });
}

const aoiRequests = () =>
  mockedFetch.mock.calls
    .map(([path]) => new URL(path as string, "http://x"))
    .filter((url) => url.pathname === "/api/aois");

function renderResults(query: string) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ChakraProvider value={defaultSystem}>
        <AreaSearchResults query={query} />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

const places = () => screen.findByRole("region", { name: "Places" });

describe("AreaSearchResults", () => {
  beforeEach(() => {
    aoiStatus = 200;
    mockedFetch.mockReset();
    routeRequests();
    useMapStore.getState().reset();
    useSelectionStore.getState().clear();
  });

  it("lists matching saved areas first, then ranked places", async () => {
    renderResults("santa");

    const mine = await screen.findByRole("region", { name: "My areas" });
    expect(within(mine).getByText("Santa Cruz plots")).toBeTruthy();
    const found = await places();
    expect(within(found).getAllByText("Santa Cruz")).toHaveLength(2);
  });

  // "All" is one request across the sets, so the backend ranks them together.
  it("searches every boundary set in one request", async () => {
    renderResults("santa");
    await places();

    expect(aoiRequests()).toHaveLength(1);
    expect(aoiRequests()[0].searchParams.getAll("source")).toEqual([
      "gadm",
      "kba",
      "wdpa",
      "landmark",
    ]);
  });

  // Two GADM places share a name; the country code tells them apart.
  it("tells same-named places apart by country", async () => {
    renderResults("santa");
    const found = await places();

    expect(within(found).getByText("State or province · ARG")).toBeTruthy();
    expect(within(found).getByText("State or province · BOL")).toBeTruthy();
    expect(within(found).getByText("Protected area")).toBeTruthy();
  });

  it("narrows to one boundary set from its pill", async () => {
    renderResults("santa");
    await places();

    fireEvent.click(screen.getByRole("button", { name: "Protected areas" }));
    await waitFor(() =>
      expect(screen.queryAllByText("State or province · ARG")).toHaveLength(0)
    );

    expect(aoiRequests().at(-1)!.searchParams.getAll("source")).toEqual([
      "wdpa",
    ]);
    expect(screen.getByText("Reserva Santa Cruz")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "My areas" })).toBeNull();
  });

  it("searches only saved areas under My areas", async () => {
    renderResults("santa");
    await places();
    const before = aoiRequests().length;

    fireEvent.click(screen.getByRole("button", { name: "My areas" }));

    expect(await screen.findByText("Santa Cruz plots")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Places" })).toBeNull();
    expect(aoiRequests()).toHaveLength(before);
  });

  it("asks for more characters before searching places", async () => {
    renderResults("sa");

    expect(await screen.findByText(/Type at least 3 characters/)).toBeTruthy();
    expect(aoiRequests()).toHaveLength(0);
  });

  it("says when no place matches", async () => {
    renderResults("zzzz");
    expect(await screen.findByText("No places match “zzzz”.")).toBeTruthy();
  });

  it("offers to retry when the search fails", async () => {
    aoiStatus = 500;
    renderResults("santa");

    expect(await screen.findByText("Couldn't search places.")).toBeTruthy();
    aoiStatus = 200;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await places()).toBeTruthy();
  });

  // A searched place behaves like a boundary click: it becomes the one
  // reference area and the analysis selection; custom areas stay.
  it("puts a place on the map as the one reference area", async () => {
    const { addLayer } = useMapStore.getState();
    addLayer({
      id: "Pará",
      name: "Pará",
      type: "geojson",
      visible: true,
      featureRefs: [{ name: "Pará", source: "gadm" }],
    });
    addLayer({
      id: "ca-9",
      name: "My plots",
      type: "geojson",
      visible: true,
      featureRefs: [{ name: "My plots", source: "custom" }],
    });
    renderResults("santa");
    const found = await places();

    const [argentina] = within(found).getAllByRole("checkbox");
    await act(async () => {
      fireEvent.click(argentina);
    });

    await waitFor(() =>
      expect(useMapStore.getState().layers.map((l) => l.id)).toEqual([
        "ca-9",
        "Santa Cruz",
      ])
    );
    expect(useMapStore.getState().analysisSelection).toEqual({
      name: "Santa Cruz",
      source: "gadm",
      srcId: "ARG.21_1",
      subtype: "state-province",
    });
    // The layer draws from the geometry registered for it.
    const { layers, geoJsonRegistry } = useMapStore.getState();
    const placeLayer = layers.find((l) => l.id === "Santa Cruz");
    const [ref] = placeLayer?.featureRefs ?? [];
    expect(ref && findRegistryEntry(geoJsonRegistry, ref)).toBeTruthy();
    expect(
      within(found).getByLabelText("Hide Santa Cruz from map")
    ).toBeTruthy();
  });

  it("takes a place off the map again", async () => {
    renderResults("santa");
    const found = await places();
    const reserve = () =>
      within(found).getAllByRole("checkbox")[2] as HTMLInputElement;

    await act(async () => {
      fireEvent.click(reserve());
    });
    await waitFor(() => expect(reserve().checked).toBe(true));
    await act(async () => {
      fireEvent.click(reserve());
    });

    expect(useMapStore.getState().layers).toHaveLength(0);
    expect(useMapStore.getState().geoJsonRegistry).toHaveLength(0);
  });
  it("clears the analysis selection when its place comes off the map", async () => {
    renderResults("santa");
    const found = await places();
    const argentina = () =>
      within(found).getAllByRole("checkbox")[0] as HTMLInputElement;

    await act(async () => {
      fireEvent.click(argentina());
    });
    await waitFor(() => expect(argentina().checked).toBe(true));
    await act(async () => {
      fireEvent.click(argentina());
    });

    expect(useMapStore.getState().analysisSelection).toBeNull();
    expect(useSelectionStore.getState().selection).toBeNull();
  });

  it("shows a hidden place again instead of removing it", async () => {
    renderResults("santa");
    const found = await places();
    const argentina = () =>
      within(found).getAllByRole("checkbox")[0] as HTMLInputElement;

    await act(async () => {
      fireEvent.click(argentina());
    });
    await waitFor(() => expect(argentina().checked).toBe(true));
    act(() => useMapStore.getState().setLayerVisibility("Santa Cruz", false));
    expect(argentina().checked).toBe(false);

    await act(async () => {
      fireEvent.click(argentina());
    });

    expect(useMapStore.getState().layers).toMatchObject([
      { id: "Santa Cruz", visible: true },
    ]);
  });

  it("flies to the geometry when a place has no bbox", async () => {
    const original = useMapStore.getState().flyToGeoJsonWithRetry;
    const flyToGeoJsonWithRetry = vi.fn();
    useMapStore.setState({ flyToGeoJsonWithRetry });
    onTestFinished(() =>
      useMapStore.setState({ flyToGeoJsonWithRetry: original })
    );
    renderResults("santa");
    const found = await places();

    const reserve = within(found).getAllByRole("checkbox")[2];
    await act(async () => {
      fireEvent.click(reserve);
    });

    await waitFor(() =>
      expect(flyToGeoJsonWithRetry).toHaveBeenCalledWith({
        type: "FeatureCollection",
        features: [],
      })
    );
  });

  it("recognises a place already picked from the boundary layer", async () => {
    // Boundary clicks key the ref by the map layer id ("GADM") and carry no
    // aoiSelection.
    const ref = { name: "Santa Cruz", source: "GADM", srcId: "ARG.21_1" };
    const { addToRegistry, addLayer } = useMapStore.getState();
    addToRegistry({
      ref,
      data: { type: "FeatureCollection", features: [] },
      srcId: "ARG.21_1",
    });
    addLayer({
      id: "Santa Cruz",
      name: "Santa Cruz",
      type: "geojson",
      visible: true,
      featureRefs: [ref],
    });
    renderResults("santa");
    const found = await places();
    const [argentina, bolivia] = within(found).getAllByRole(
      "checkbox"
    ) as HTMLInputElement[];
    expect(argentina.checked).toBe(true);
    expect(bolivia.checked).toBe(false);

    await act(async () => {
      fireEvent.click(argentina);
    });

    expect(useMapStore.getState().layers).toHaveLength(0);
    expect(useMapStore.getState().geoJsonRegistry).toHaveLength(0);
  });
});
