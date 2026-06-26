import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

// The store's transitive imports reach the Chakra toaster (.tsx) which node
// can't transform. Stub at the module boundary — these tests don't touch
// thread/network actions.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import useSidebarStore from "../sidebarStore";

describe("sidebarStore — catalog column panels", () => {
  beforeEach(() => {
    useSidebarStore.setState({
      dataCatalogOpen: false,
      areasPanelOpen: false,
    });
  });

  it("opening data catalog closes the areas panel", () => {
    useSidebarStore.getState().setAreasPanelOpen(true);
    useSidebarStore.getState().setDataCatalogOpen(true);

    const state = useSidebarStore.getState();
    expect(state.dataCatalogOpen).toBe(true);
    expect(state.areasPanelOpen).toBe(false);
  });

  it("opening areas panel closes data catalog", () => {
    useSidebarStore.getState().setDataCatalogOpen(true);
    useSidebarStore.getState().setAreasPanelOpen(true);

    const state = useSidebarStore.getState();
    expect(state.areasPanelOpen).toBe(true);
    expect(state.dataCatalogOpen).toBe(false);
  });

  it("toggling data catalog on closes areas panel", () => {
    useSidebarStore.getState().setAreasPanelOpen(true);
    useSidebarStore.getState().toggleDataCatalog();

    const state = useSidebarStore.getState();
    expect(state.dataCatalogOpen).toBe(true);
    expect(state.areasPanelOpen).toBe(false);
  });

  it("toggling areas panel on closes data catalog", () => {
    useSidebarStore.getState().setDataCatalogOpen(true);
    useSidebarStore.getState().toggleAreasPanel();

    const state = useSidebarStore.getState();
    expect(state.areasPanelOpen).toBe(true);
    expect(state.dataCatalogOpen).toBe(false);
  });

  it("toggling a panel off when no other panel is open leaves both closed", () => {
    useSidebarStore.getState().setAreasPanelOpen(true);
    useSidebarStore.getState().toggleAreasPanel();

    const state = useSidebarStore.getState();
    expect(state.areasPanelOpen).toBe(false);
    expect(state.dataCatalogOpen).toBe(false);
  });

  it("setDataCatalogOpen(false) does not reopen the areas panel", () => {
    useSidebarStore.setState({ dataCatalogOpen: true, areasPanelOpen: false });
    useSidebarStore.getState().setDataCatalogOpen(false);

    const state = useSidebarStore.getState();
    expect(state.dataCatalogOpen).toBe(false);
    expect(state.areasPanelOpen).toBe(false);
  });
});
