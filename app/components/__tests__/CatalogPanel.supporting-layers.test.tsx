// @vitest-environment happy-dom
/**
 * LGMS's LULUCF/agriculture layers used to be separate standalone dataset
 * cards (ids 13-16); they're now folded into dataset 12's `layers[1:]` and
 * disclosed as "supporting layers" under the LGMS card itself (PZB-1346,
 * project-zeno PR #830 — see the comment above the LGMS entry in
 * app/constants/datasets.ts). This covers the new disclosure UI end to end.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice dynamically imports chatStore to fold layer add/remove
// into `lastSentContext`; stub it so the store round-trip doesn't depend on
// chatStore's own (unrelated) import chain resolving cleanly in this test.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import DataCatalogPanel from "../CatalogPanel";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";

/** Point `useEnabledFlags` (which reads the URL) at a set of flags. */
const setFlags = (...flags: string[]) =>
  window.history.replaceState(
    {},
    "",
    flags.length ? `/?ff=${flags.join(",")}` : "/"
  );

function switchFor(ariaLabel: string): HTMLInputElement {
  const root = screen.getByLabelText(ariaLabel);
  return within(root).getByRole("checkbox") as HTMLInputElement;
}

function renderPanel() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <DataCatalogPanel />
    </ChakraProvider>
  );
}

describe("Data Catalog panel — LGMS supporting layers", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useSidebarStore.setState({ dataCatalogOpen: true, isChatFullSize: true });
    setFlags("net-flux");
  });

  it("shows the LGMS card and its supporting-layer rows, not standalone sector cards", () => {
    renderPanel();

    expect(screen.getByText("Land GHG Monitoring System (LGMS)")).toBeTruthy();
    expect(screen.getByText("4 supporting layers")).toBeTruthy();
    expect(screen.getByText("— view only")).toBeTruthy();
    expect(screen.getByText("LGMS LULUCF net GHG flux")).toBeTruthy();
    expect(screen.getByText("LGMS agriculture emissions")).toBeTruthy();
    expect(screen.getByText("LGMS cropland management emissions")).toBeTruthy();
    expect(screen.getByText("LGMS livestock emissions")).toBeTruthy();
    expect(screen.getAllByText("VIEW ONLY")).toHaveLength(4);
  });

  it("selecting a supporting layer shows only that one on the map", async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(switchFor("Show LGMS LULUCF net GHG flux on map"));
    });

    let ids = useMapStore.getState().layers.map((l) => l.id);
    expect(ids).toEqual(["dataset-12-lulucf"]);

    // Switching to the other supporting layer replaces it — only one of a
    // multi-layer dataset's layers is ever shown at once.
    await act(async () => {
      fireEvent.click(switchFor("Show LGMS agriculture emissions on map"));
    });

    ids = useMapStore.getState().layers.map((l) => l.id);
    expect(ids).toEqual(["dataset-12-agriculture"]);
  });

  it("turning a supporting layer off removes it from the map", async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(switchFor("Show LGMS LULUCF net GHG flux on map"));
    });
    expect(useMapStore.getState().layers).toHaveLength(1);

    await act(async () => {
      fireEvent.click(switchFor("Hide LGMS LULUCF net GHG flux from map"));
    });
    expect(useMapStore.getState().layers).toHaveLength(0);
  });
});
