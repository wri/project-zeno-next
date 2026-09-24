// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  type RenderResult,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

// The static-map thumbnail reads the map store (maplibre); stub it out so the
// picker renders without the map stack.
vi.mock("@/app/components/AreaCatalogThumbnail", () => ({
  AreaCatalogThumbnail: () => null,
}));

const pushSpy = vi.fn();
vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ push: pushSpy }),
}));

const rowsState = vi.hoisted(() => ({
  rows: [
    {
      source: "custom",
      src_id: "area-1",
      subtype: "custom-area",
      name: "My farm",
      typeLabel: "Custom area",
      previousAnalyses: 2,
    },
    {
      source: "gadm",
      src_id: "BRA",
      subtype: "country",
      name: "Brazil",
      typeLabel: "Administrative areas",
      previousAnalyses: 0,
    },
    {
      source: "gadm",
      src_id: "BRA.16_1",
      subtype: "state-province",
      name: "Paraná",
      typeLabel: "Administrative areas",
      previousAnalyses: 0,
    },
  ],
  isLoading: false,
  isSearching: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
}));

const useAreaPickerRowsMock = vi.hoisted(() => vi.fn());
vi.mock("../../hooks/useAreaPickerRows", () => ({
  useAreaPickerRows: useAreaPickerRowsMock,
}));

const createDashboardAsync = vi.fn();
vi.mock("../../hooks/useCreateDashboard", () => ({
  useCreateDashboard: () => ({
    createDashboardAsync,
    isCreating: false,
  }),
}));

const createAreaAsync = vi.hoisted(() => vi.fn());
vi.mock("@/app/hooks/useCustomAreasCreate", () => ({
  useCustomAreasCreate: () => ({ createAreaAsync, isCreating: false }),
}));

const renameAreaAsync = vi.fn();
const deleteAreaAsync = vi.fn();
vi.mock("@/app/hooks/useCustomAreasMutations", () => ({
  useCustomAreasUpdate: () => ({ renameAreaAsync, isRenaming: false }),
  useCustomAreasDelete: () => ({ deleteAreaAsync, isDeleting: false }),
}));

import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import { NewDashboardScreen } from "../NewDashboardScreen";

function renderScreen(): RenderResult {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <NewDashboardScreen />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

describe("NewDashboardScreen", () => {
  beforeEach(() => {
    pushSpy.mockReset();
    createDashboardAsync.mockReset();
    useAreaPickerRowsMock.mockReset();
    useAreaPickerRowsMock.mockImplementation(() => rowsState);
  });

  it("renders rows from useAreaPickerRows", () => {
    renderScreen();
    expect(screen.getByText("My farm")).toBeTruthy();
    expect(screen.getByText("Paraná")).toBeTruthy();
  });

  it("nests admin areas under their country, expanded by default", () => {
    renderScreen();
    // Paraná sits under Brazil with a breadcrumb context line.
    expect(screen.getByText("Brazil › Paraná")).toBeTruthy();
    expect(screen.getByLabelText("Collapse Brazil")).toBeTruthy();
  });

  it("collapses a country row to hide its nested areas", () => {
    renderScreen();
    fireEvent.click(screen.getByLabelText("Collapse Brazil"));
    expect(screen.queryByText("Paraná")).toBeNull();

    fireEvent.click(screen.getByLabelText("Expand Brazil"));
    expect(screen.getByText("Paraná")).toBeTruthy();
  });

  it("does not create a dashboard when toggling expansion", () => {
    renderScreen();
    fireEvent.click(screen.getByLabelText("Collapse Brazil"));
    expect(createDashboardAsync).not.toHaveBeenCalled();
  });

  it("creates a dashboard and routes in when a row is clicked", async () => {
    createDashboardAsync.mockResolvedValue({ id: "dash-1", name: "Paraná" });
    renderScreen();

    fireEvent.click(screen.getByText("Paraná"));

    await waitFor(() =>
      expect(createDashboardAsync).toHaveBeenCalledWith({
        aois: [
          {
            source: "gadm",
            src_id: "BRA.16_1",
            subtype: "state-province",
            name: "Paraná",
          },
        ],
      })
    );
    await waitFor(() =>
      expect(pushSpy).toHaveBeenCalledWith("/dashboards/dash-1")
    );
  });

  it("creates a dashboard when a row is activated with Enter", async () => {
    createDashboardAsync.mockResolvedValue({ id: "dash-1", name: "Paraná" });
    renderScreen();

    const row = screen.getByLabelText("Create dashboard for Paraná");
    fireEvent.keyDown(row, { key: "Enter" });

    await waitFor(() =>
      expect(createDashboardAsync).toHaveBeenCalledWith({
        aois: [
          {
            source: "gadm",
            src_id: "BRA.16_1",
            subtype: "state-province",
            name: "Paraná",
          },
        ],
      })
    );
  });

  it("filters rows via the search box", () => {
    renderScreen();
    fireEvent.change(screen.getByPlaceholderText("Search areas by name..."), {
      target: { value: "farm" },
    });
    // rowsState is a static mock, so this asserts the input accepted the value;
    // filtering itself is covered by useAreaPickerRows tests.
    expect(
      (
        screen.getByPlaceholderText(
          "Search areas by name..."
        ) as HTMLInputElement
      ).value
    ).toBe("farm");
  });

  it("shows a rename/delete menu only for custom-area rows", () => {
    renderScreen();
    expect(screen.getAllByLabelText("Area actions")).toHaveLength(1);
  });

  describe("area upload", () => {
    const SQUARE = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [30, 10],
            [30, 10.5],
            [30.5, 10.5],
            [30.5, 10],
            [30, 10],
          ],
        ],
      },
    };

    async function uploadFile(file: File) {
      fireEvent.click(screen.getByRole("button", { name: "Upload area" }));
      fireEvent.change(await screen.findByLabelText("Area file"), {
        target: { files: [file] },
      });
      await screen.findByText(new RegExp(file.name));
      fireEvent.click(screen.getByRole("button", { name: /^upload$/i }));
    }

    beforeEach(() => {
      vi.mocked(toaster.create).mockClear();
      vi.mocked(apiFetch).mockReset();
      createAreaAsync.mockReset();
    });

    it("opens the shared upload dialog, which accepts CSV and zip", async () => {
      renderScreen();
      fireEvent.click(screen.getByRole("button", { name: "Upload area" }));
      const input = (await screen.findByLabelText(
        "Area file"
      )) as HTMLInputElement;
      expect(input.accept).toBe(".geojson,.csv,.zip");
      expect(
        screen.getByText(/\.geojson up to 1 MB, or \.csv \/ zipped shapefile/)
      ).toBeTruthy();
    });

    it("toasts a single GeoJSON area without creating a dashboard", async () => {
      createAreaAsync.mockResolvedValue({
        id: "a1",
        name: "Hidden Valley",
        geometries: [],
        created_at: "",
        updated_at: "",
      });
      renderScreen();

      await uploadFile(new File([JSON.stringify(SQUARE)], "area.geojson"));

      await waitFor(() =>
        expect(toaster.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Area uploaded",
            description: '"Hidden Valley" is ready to use.',
          })
        )
      );
      expect(createDashboardAsync).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it("toasts a batch count and leaves the pick to the user", async () => {
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            upload_batch_id: "b1",
            areas: [
              { id: "a1", name: "North" },
              { id: "a2", name: "South" },
            ],
          }),
          { status: 200 }
        )
      );
      renderScreen();

      await uploadFile(new File(["name,geom\n"], "areas.csv"));

      await waitFor(() =>
        expect(toaster.create).toHaveBeenCalledWith(
          expect.objectContaining({ title: "2 areas created" })
        )
      );
      expect(createDashboardAsync).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it("shows backend row errors inline", async () => {
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(
          JSON.stringify({ detail: { errors: ["row 3: invalid WKT"] } }),
          { status: 422 }
        )
      );
      renderScreen();

      await uploadFile(new File(["name,geom\n"], "areas.csv"));

      expect(await screen.findByText("row 3: invalid WKT")).toBeTruthy();
      expect(toaster.create).not.toHaveBeenCalled();
    });
  });

  describe("loading skeletons", () => {
    it("shows skeleton rows during the initial load", () => {
      useAreaPickerRowsMock.mockImplementation(() => ({
        ...rowsState,
        rows: [],
        isLoading: true,
      }));
      renderScreen();
      expect(
        screen.getAllByTestId("area-picker-skeleton-row").length
      ).toBeGreaterThan(0);
    });

    it("replaces stale rows with skeletons while a search is in flight", () => {
      useAreaPickerRowsMock.mockImplementation(() => ({
        ...rowsState,
        isSearching: true,
      }));
      renderScreen();
      expect(
        screen.getAllByTestId("area-picker-skeleton-row").length
      ).toBeGreaterThan(0);
      expect(screen.queryByText("My farm")).toBeNull();
    });

    it("hides the empty state and load-more button while searching", () => {
      useAreaPickerRowsMock.mockImplementation(() => ({
        ...rowsState,
        rows: [],
        isSearching: true,
        hasNextPage: true,
      }));
      renderScreen();
      expect(screen.queryByText("No areas match your search.")).toBeNull();
      expect(screen.queryByText("Load more")).toBeNull();
    });

    it("does not render skeletons when idle", () => {
      renderScreen();
      expect(screen.queryByTestId("area-picker-skeleton-row")).toBeNull();
      expect(screen.getByText("My farm")).toBeTruthy();
    });
  });

  describe("search-as-you-type", () => {
    const lastSearchArg = () =>
      useAreaPickerRowsMock.mock.calls.at(-1)?.[1] as string | undefined;

    const searchInput = () =>
      screen.getByPlaceholderText("Search areas by name...");

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not forward terms under 3 characters to the row hook", () => {
      renderScreen();
      fireEvent.change(searchInput(), { target: { value: "br" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(lastSearchArg()).toBe("");
    });

    it("forwards the term after the debounce once 3 characters are typed", () => {
      renderScreen();
      fireEvent.change(searchInput(), { target: { value: "bra" } });
      // Not yet — the debounce hasn't elapsed.
      expect(lastSearchArg()).toBe("");
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(lastSearchArg()).toBe("bra");
    });

    it("keeps searching as more characters are typed", () => {
      renderScreen();
      fireEvent.change(searchInput(), { target: { value: "bra" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.change(searchInput(), { target: { value: "braz" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(lastSearchArg()).toBe("braz");
    });

    it("reverts to the unfiltered list when the term drops under 3 characters", () => {
      renderScreen();
      fireEvent.change(searchInput(), { target: { value: "bra" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.change(searchInput(), { target: { value: "br" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(lastSearchArg()).toBe("");
    });

    it("shows a hint while the typed term is under 3 characters", () => {
      renderScreen();
      const hint = "Type at least 3 characters to search.";
      fireEvent.change(searchInput(), { target: { value: "br" } });
      expect(screen.getByText(hint)).toBeTruthy();
      fireEvent.change(searchInput(), { target: { value: "bra" } });
      expect(screen.queryByText(hint)).toBeNull();
    });
  });
});
