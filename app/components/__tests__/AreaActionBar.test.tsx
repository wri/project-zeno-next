// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useMapStore from "@/app/store/mapStore";
import type { PendingDrawnArea } from "@/app/store/drawAreaSlice";

import { AreaActionBar } from "../AreaActionBar";

const geometry: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function pending(name: string | null): PendingDrawnArea {
  return { geometry, bbox: [0, 0, 1, 1], name };
}

function renderBar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChakraProvider value={defaultSystem}>
        <AreaActionBar />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

describe("AreaActionBar", () => {
  const actions = {
    startDrawing: vi.fn(),
    cancelDrawing: vi.fn(),
    confirmDrawing: vi.fn(),
    setSelectionMode: vi.fn(),
    toggleUploadAreaDialog: vi.fn(),
    clearValidationError: vi.fn(),
  };

  beforeEach(() => {
    Object.values(actions).forEach((fn) => fn.mockReset());
    useMapStore.setState({
      ...actions,
      isDrawingMode: false,
      pendingDrawnArea: null,
      validationError: null,
      layers: [],
    });
  });

  it("starts drawing from a labelled button", () => {
    renderBar();
    fireEvent.click(button("Draw on map"));

    expect(actions.startDrawing).toHaveBeenCalledOnce();
    expect(actions.setSelectionMode).toHaveBeenCalledWith({
      type: "Drawing",
      name: undefined,
    });
  });

  it("opens the upload dialog from a labelled button", () => {
    renderBar();
    fireEvent.click(button("Upload file"));

    expect(actions.toggleUploadAreaDialog).toHaveBeenCalledOnce();
  });

  it("while drawing, explains how and offers only Cancel", () => {
    useMapStore.setState({ isDrawingMode: true });
    renderBar();

    expect(screen.getByRole("status").textContent).toContain(
      "double-click to finish"
    );
    expect(screen.queryByRole("button", { name: "Draw on map" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save area" })).toBeNull();

    fireEvent.click(button("Cancel"));
    expect(actions.cancelDrawing).toHaveBeenCalledOnce();
  });

  it("holds Save until the drawn shape has a name", () => {
    useMapStore.setState({
      isDrawingMode: true,
      pendingDrawnArea: pending(null),
    });
    renderBar();

    expect(screen.getByText("Naming area…")).toBeTruthy();
    expect((button("Save area") as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves a named shape and puts it on the map", async () => {
    actions.confirmDrawing.mockResolvedValue({
      id: "a1",
      name: "Nakuru County, Kenya",
      geometries: [{ type: "Polygon", coordinates: [] }],
    });
    useMapStore.setState({
      isDrawingMode: true,
      pendingDrawnArea: pending("Nakuru County, Kenya"),
    });
    renderBar();

    expect(screen.getByText("Nakuru County, Kenya")).toBeTruthy();
    await act(async () => {
      fireEvent.click(button("Save area"));
    });

    expect(actions.confirmDrawing).toHaveBeenCalledOnce();
    expect(useMapStore.getState().layers.map((l) => l.name)).toEqual([
      "Nakuru County, Kenya",
    ]);
  });

  it("explains a rejected shape in the strip and offers to try again", () => {
    useMapStore.setState({
      validationError: { code: "too-large", area: 4_322_548 },
    });
    renderBar();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Area too large");
    expect(alert.textContent).toContain("Maximum is");
    expect(screen.queryByRole("button", { name: "Draw on map" })).toBeNull();

    fireEvent.click(button("Try again"));
    expect(actions.startDrawing).toHaveBeenCalledOnce();
  });

  it("dismisses a rejected shape back to Draw and Upload", () => {
    useMapStore.setState({
      validationError: { code: "too-small", area: 0.04 },
    });
    renderBar();
    expect(screen.getByRole("alert").textContent).toContain("Minimum is");

    fireEvent.click(button("Dismiss"));
    expect(actions.clearValidationError).toHaveBeenCalledOnce();
  });

  // While the panel searches, Draw / Upload give way; a drawing still shows.
  it("hides Draw and Upload when asked, but not a drawing", () => {
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <ChakraProvider value={defaultSystem}>
          <AreaActionBar hideIdle />
        </ChakraProvider>
      </QueryClientProvider>
    );
    expect(screen.queryByRole("button", { name: "Draw on map" })).toBeNull();
    unmount();

    useMapStore.setState({ isDrawingMode: true });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ChakraProvider value={defaultSystem}>
          <AreaActionBar hideIdle />
        </ChakraProvider>
      </QueryClientProvider>
    );
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("redraws by starting a fresh drawing", () => {
    useMapStore.setState({
      isDrawingMode: true,
      pendingDrawnArea: pending("Nakuru County, Kenya"),
    });
    renderBar();
    fireEvent.click(button("Redraw"));

    expect(actions.startDrawing).toHaveBeenCalledOnce();
  });
});
