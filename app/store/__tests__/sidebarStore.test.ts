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
      insightsPanelOpen: false,
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

  it("opening the insights panel closes data catalog and areas", () => {
    useSidebarStore.getState().setDataCatalogOpen(true);
    useSidebarStore.getState().setAreasPanelOpen(true);
    useSidebarStore.getState().setInsightsPanelOpen(true);

    const state = useSidebarStore.getState();
    expect(state.insightsPanelOpen).toBe(true);
    expect(state.dataCatalogOpen).toBe(false);
    expect(state.areasPanelOpen).toBe(false);
  });

  it("opening a sibling panel closes the insights panel", () => {
    useSidebarStore.getState().setInsightsPanelOpen(true);
    useSidebarStore.getState().toggleAreasPanel();

    const state = useSidebarStore.getState();
    expect(state.areasPanelOpen).toBe(true);
    expect(state.insightsPanelOpen).toBe(false);
  });
});

describe("sidebarStore — chat input focus requests", () => {
  it("increments the focus token on each request", () => {
    const before = useSidebarStore.getState().chatInputFocusToken;

    useSidebarStore.getState().requestChatInputFocus();
    expect(useSidebarStore.getState().chatInputFocusToken).toBe(before + 1);

    // A second request bumps it again, even though nothing else changed —
    // ChatInput's effect keys off the token changing, not a boolean flag.
    useSidebarStore.getState().requestChatInputFocus();
    expect(useSidebarStore.getState().chatInputFocusToken).toBe(before + 2);
  });
});
