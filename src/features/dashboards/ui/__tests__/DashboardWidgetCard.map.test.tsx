// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Keep the geometry query off the network (the map widget fires it on mount).
vi.mock("@/app/utils/geometryClient", () => ({
  fetchGeometry: vi.fn(() => new Promise(() => {})),
}));

// Real MapLibre needs WebGL (unavailable in happy-dom): stub react-map-gl.
vi.mock("react-map-gl/maplibre", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const MapGl = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mapgl">{children}</div>
  );
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

import DashboardWidgetCard from "../DashboardWidgetCard";

const renderMapCard = (isOwner: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <DashboardWidgetCard
          title="Tree cover loss"
          card={null}
          map={{
            kind: "dataset",
            title: "Tree cover loss",
            tileUrl: "https://example.test/{z}/{x}/{y}.png",
          }}
          aoi={undefined}
          viewportBbox={null}
          placeholder={null}
          removeMode="widget"
          isOwner={isOwner}
          isDouble={false}
          onArmDrag={() => {}}
          onToggleSize={() => {}}
          onRemove={() => {}}
        />
      </ChakraProvider>
    </QueryClientProvider>
  );

describe("DashboardWidgetCard map full screen", () => {
  it("lets a viewer open the map full screen and closes it again", async () => {
    renderMapCard(false);

    expect(screen.getAllByTestId("mapgl")).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", { name: "View map full screen" })
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Tree cover loss")).toBeTruthy();
    expect(screen.getAllByTestId("mapgl")).toHaveLength(2);

    fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("DashboardWidgetCard body slot", () => {
  it("renders a caller's body where the chart or map would be, with no full screen", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ChakraProvider value={defaultSystem}>
          <DashboardWidgetCard
            title="Integrated alerts in Guarapuava"
            card={null}
            placeholder={null}
            body={<div data-testid="own-body">list and map</div>}
            removeMode="widget"
            isOwner
            isDouble
            onArmDrag={() => {}}
            onToggleSize={() => {}}
            onRemove={() => {}}
          />
        </ChakraProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("own-body").textContent).toBe("list and map");
    expect(screen.queryByTestId("mapgl")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "View map full screen" })
    ).toBeNull();
    // The owner actions are the shell's, as for every other widget.
    expect(screen.getByLabelText("Remove from dashboard")).toBeTruthy();
    expect(screen.getByLabelText("Shrink to one column")).toBeTruthy();
  });

  it("gives a placeholder precedence over a body", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ChakraProvider value={defaultSystem}>
          <DashboardWidgetCard
            title="Integrated alerts"
            card={null}
            placeholder="This alerts widget can't be displayed."
            body={<div data-testid="own-body" />}
            removeMode="widget"
            isOwner={false}
            isDouble
            onArmDrag={() => {}}
            onToggleSize={() => {}}
            onRemove={() => {}}
          />
        </ChakraProvider>
      </QueryClientProvider>
    );

    expect(
      screen.getByText("This alerts widget can't be displayed.")
    ).toBeTruthy();
    expect(screen.queryByTestId("own-body")).toBeNull();
  });
});
