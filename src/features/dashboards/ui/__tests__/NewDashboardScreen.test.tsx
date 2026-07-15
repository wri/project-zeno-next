// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  type RenderResult,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const pushSpy = vi.fn();
vi.mock("next/navigation", () => ({
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
      src_id: "BRA.16_1",
      subtype: "adm1",
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

vi.mock("../../hooks/useAreaPickerRows", () => ({
  useAreaPickerRows: () => rowsState,
}));

const createDashboardAsync = vi.fn();
vi.mock("../../hooks/useCreateDashboard", () => ({
  useCreateDashboard: () => ({
    createDashboardAsync,
    isCreating: false,
  }),
}));

vi.mock("@/app/hooks/useCustomAreasCreate", () => ({
  useCustomAreasCreate: () => ({ createAreaAsync: vi.fn(), isCreating: false }),
}));

const renameAreaAsync = vi.fn();
const deleteAreaAsync = vi.fn();
vi.mock("@/app/hooks/useCustomAreasMutations", () => ({
  useCustomAreasUpdate: () => ({ renameAreaAsync, isRenaming: false }),
  useCustomAreasDelete: () => ({ deleteAreaAsync, isDeleting: false }),
}));

import { NewDashboardScreen } from "../NewDashboardScreen";

function renderScreen(): RenderResult {
  return render(
    <ChakraProvider value={defaultSystem}>
      <NewDashboardScreen />
    </ChakraProvider>
  );
}

describe("NewDashboardScreen", () => {
  beforeEach(() => {
    pushSpy.mockReset();
    createDashboardAsync.mockReset();
  });

  it("renders rows from useAreaPickerRows", () => {
    renderScreen();
    expect(screen.getByText("My farm")).toBeTruthy();
    expect(screen.getByText("Paraná")).toBeTruthy();
  });

  it("renders skeleton rows instead of rows or empty state while loading", () => {
    const previousRows = rowsState.rows;
    rowsState.rows = [];
    rowsState.isLoading = true;
    try {
      renderScreen();
      expect(screen.getAllByTestId("area-skeleton-row")).toHaveLength(4);
      expect(screen.queryByText(/No areas/)).toBeNull();
    } finally {
      rowsState.rows = previousRows;
      rowsState.isLoading = false;
    }
  });

  it("renders skeleton rows while searching from an empty result set", () => {
    const previousRows = rowsState.rows;
    rowsState.rows = [];
    rowsState.isSearching = true;
    try {
      renderScreen();
      expect(screen.getAllByTestId("area-skeleton-row")).toHaveLength(4);
      expect(screen.queryByText(/No areas/)).toBeNull();
    } finally {
      rowsState.rows = previousRows;
      rowsState.isSearching = false;
    }
  });

  it("shows the not-found message with the quoted search term", () => {
    const previousRows = rowsState.rows;
    rowsState.rows = [];
    try {
      renderScreen();
      fireEvent.change(screen.getByPlaceholderText("Search areas by name..."), {
        target: { value: "jkahskjhaas" },
      });
      expect(screen.getByText("“jkahskjhaas”")).toBeTruthy();
      expect(screen.getByText(/didn’t return any results/)).toBeTruthy();
      expect(
        screen.getByText("Please check spelling and try again.")
      ).toBeTruthy();
    } finally {
      rowsState.rows = previousRows;
    }
  });

  it("shows the generic empty state when a category has no areas and no search", () => {
    const previousRows = rowsState.rows;
    rowsState.rows = [];
    try {
      renderScreen();
      expect(screen.getByText("No areas found in this category.")).toBeTruthy();
    } finally {
      rowsState.rows = previousRows;
    }
  });

  it("retains previous rows without a loading indicator while searching", () => {
    rowsState.isSearching = true;
    try {
      renderScreen();
      expect(screen.getByText("My farm")).toBeTruthy();
      expect(screen.queryByTestId("area-skeleton-row")).toBeNull();
    } finally {
      rowsState.isSearching = false;
    }
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
            subtype: "adm1",
            name: "Paraná",
          },
        ],
      })
    );
    await waitFor(() =>
      expect(pushSpy).toHaveBeenCalledWith("/dashboards/dash-1?ff=dashboard")
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
            subtype: "adm1",
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
});
