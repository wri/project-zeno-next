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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice dynamically imports chatStore to fold layer add/remove
// into `lastSentContext`; stub it so the store round-trip doesn't depend on
// chatStore's own (unrelated) import chain resolving cleanly in this test.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

// That import is fire-and-forget, so the last toggle's can still be pending
// when the file finishes; settle it first or the environment teardown throws
// and `pnpm test` exits 1 with every test passing.
afterEach(() => vi.dynamicImportSettled());

import DataCatalogPanel from "../CatalogPanel";
import { DATASET_CARDS } from "@/app/constants/datasets";
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
    // Four LGMS sector rows, plus one per standalone view-only card (IFL,
    // Primary Forests, ...).
    const standaloneViewOnly = DATASET_CARDS.filter(
      (c) => c.viewOnly && !c.featureFlag
    ).length;
    expect(screen.getAllByText("VIEW ONLY")).toHaveLength(
      4 + standaloneViewOnly
    );
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

describe("Data Catalog panel — view-only datasets", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useSidebarStore.setState({ dataCatalogOpen: true, isChatFullSize: true });
    // Intact Forest Landscapes is the standalone view-only card; it is still
    // behind `?ff=ifl` on this branch.
    setFlags("ifl");
  });

  it("badges a view-only row VIEW ONLY; analysable rows get no badge", () => {
    renderPanel();

    const viewOnly = rowFor("Intact Forest Landscapes");
    expect(viewOnly.textContent).toContain("VIEW ONLY");

    const analysable = rowFor("Tree cover loss");
    expect(analysable.textContent).not.toContain("VIEW ONLY");
  });
});

describe("Data Catalog panel — compact rows", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useSidebarStore.setState({ dataCatalogOpen: true, isChatFullSize: true });
    setFlags();
  });

  it("clicking a row's text adds the dataset to the map, clicking again removes it", async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Tree cover loss"));
    });
    expect(useMapStore.getState().layers.map((l) => l.id)).toContain(
      "dataset-4"
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Tree cover loss"));
    });
    expect(useMapStore.getState().layers).toHaveLength(0);
  });

  it("opening dataset info does not toggle the layer", async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(
        screen.getByLabelText("Show dataset info: Tree cover loss")
      );
    });

    expect(useMapStore.getState().layers).toHaveLength(0);
  });

  // Visibility and opacity live in the legend; the catalogue only adds and
  // removes datasets.
  it("shows no per-layer opacity controls once a dataset is on", async () => {
    renderPanel();

    await act(async () => {
      fireEvent.click(switchFor("Show Tree cover loss on map"));
    });

    expect(screen.queryByLabelText(/opacity/i)).toBeNull();
  });
});

/** The row root: the nearest ancestor that also holds the show-on-map switch. */
function rowFor(title: string): HTMLElement {
  let el: HTMLElement | null = screen.getByText(title);
  while (el && !el.querySelector('input[type="checkbox"]')) {
    el = el.parentElement;
  }
  if (!el) throw new Error(`No row found for ${title}`);
  return el;
}
