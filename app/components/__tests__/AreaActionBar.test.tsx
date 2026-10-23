// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice lazily imports chatStore to fold layer changes into the
// sent context; stub it so that import can't outlive the test environment.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

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
  return render(
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
    // Selected for analysis, so the chat nudges as for a boundary click.
    expect(useMapStore.getState().analysisSelection).toEqual({
      name: "Nakuru County, Kenya",
      source: "custom",
      srcId: "a1",
      subtype: "custom-area",
    });
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
      validationError: { code: "too-large", area: 4_322_548 },
    });
    renderBar();
    expect(screen.getByRole("alert").textContent).toContain("Maximum is");

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

  it("locks the strip while a save is in flight, so it can't save twice", async () => {
    let resolve!: (v: unknown) => void;
    actions.confirmDrawing.mockImplementation(
      () => new Promise((r) => (resolve = r))
    );
    useMapStore.setState({
      isDrawingMode: true,
      pendingDrawnArea: pending("Nakuru County, Kenya"),
    });
    renderBar();

    await act(async () => {
      fireEvent.click(button("Save area"));
    });
    for (const name of ["Save area", "Redraw", "Cancel"]) {
      expect((button(name) as HTMLButtonElement).disabled).toBe(true);
    }
    fireEvent.click(button("Save area"));
    expect(actions.confirmDrawing).toHaveBeenCalledOnce();

    await act(async () => resolve(undefined));
    expect((button("Save area") as HTMLButtonElement).disabled).toBe(false);
  });

  it("cancels the drawing when the panel closes mid-draw", () => {
    useMapStore.setState({ isDrawingMode: true });
    const { unmount } = renderBar();

    unmount();

    expect(actions.cancelDrawing).toHaveBeenCalledOnce();
  });

  it("leaves the map alone when the panel closes while not drawing", () => {
    const { unmount } = renderBar();

    unmount();

    expect(actions.cancelDrawing).not.toHaveBeenCalled();
  });
});
