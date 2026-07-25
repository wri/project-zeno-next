// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/app/utils/geometryClient", () => ({
  fetchGeometry: vi.fn(() => new Promise(() => {})),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "d1" }),
}));

const mapMounts = { count: 0 };
vi.mock("react-map-gl/maplibre", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const MapGl = ({ children }: { children?: React.ReactNode }) => {
    useEffect(() => {
      mapMounts.count += 1;
    }, []);
    return <div data-testid="mapgl">{children}</div>;
  };
  return {
    __esModule: true,
    default: MapGl,
    AttributionControl: Passthrough,
    Layer: Passthrough,
    Marker: Passthrough,
    NavigationControl: Passthrough,
    Source: Passthrough,
  };
});

import type { Dashboard } from "../../api/schemas";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Ucayali Forest Monitor",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [
    {
      source: "gadm",
      src_id: "PER.25_1",
      subtype: "state-province",
      name: "Ucayali",
      id: "a1",
      position: 0,
    },
  ],
  widgets: [
    {
      id: "m1",
      position: 0,
      widget_type: "map",
      config: {
        dataset: {
          tile_url: "https://example.test/m1/{z}/{x}/{y}.png",
          dataset_name: "Layer m1",
        },
      },
      created_at: "2026-07-01T00:00:00Z",
      insight: null,
    },
  ],
};

vi.mock("../dashboardQueries", () => ({
  useDashboard: () => ({
    data: dashboard,
    isLoading: false,
    isError: false,
  }),
  useUpdateWidget: () => ({ mutate: vi.fn() }),
  useDeleteWidget: () => ({ mutate: vi.fn() }),
  useReorderWidgets: () => ({ mutate: vi.fn() }),
}));

import DashboardReportPage from "../DashboardReportPage";
import useAuthStore from "@/app/store/authStore";

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardReportPage />
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe("DashboardReportPage", () => {
  beforeEach(() => {
    mapMounts.count = 0;
    // Even the owner gets the report rendering here — the route forces it.
    useAuthStore.setState({ userId: "u1" });
  });

  it("renders the document header and the widgets without editing chrome", () => {
    const { getByText, queryAllByLabelText } = renderPage();
    expect(getByText("Ucayali Forest Monitor")).toBeTruthy();
    expect(getByText("Area of interest: Ucayali")).toBeTruthy();
    expect(mapMounts.count).toBe(1);
    // Forced report mode: no chrome, even for the owner.
    expect(queryAllByLabelText("Drag to reposition")).toHaveLength(0);
    expect(queryAllByLabelText("Remove from dashboard")).toHaveLength(0);
  });

  it("offers Save as PDF via the browser's print dialog", () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    const { getByRole } = renderPage();
    fireEvent.click(getByRole("button", { name: /save as pdf/i }));
    expect(printSpy).toHaveBeenCalled();
  });
});
