import { create } from "zustand";
import { API_CONFIG } from "@/app/config/api";
import { apiFetch } from "@/app/lib/api-client";
import { queryClient } from "@/app/lib/query-client";
import type { InfiniteData } from "@tanstack/react-query";
import type { ThreadEntry } from "@/app/hooks/useThreadsInfinite";

interface ThreadsPage {
  threads: ThreadEntry[];
  nextCursor: string | null;
}

/** The Areas panel's tabs: Boundaries, In this conversation, My areas. */
export type AreasPanelFilter = "boundaries" | "conversation" | "mine";

interface SidebarState {
  /** The mobile drawer (conversation history and account). */
  sideBarVisible: boolean;
  toggleSidebar: () => void;
  /** The menu side bar the header's menu button opens (desktop). */
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  renameThread: (threadId: string, newName: string) => Promise<void>;
  shareThread: (threadId: string, isPublic: boolean) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  fetchApiStatus: () => Promise<void>;
  apiStatus: "Idle" | "OK" | "Error";
  isChatFullSize: boolean;
  setChatFullSize: (value: boolean) => void;
  /**
   * Whether the compact chat panel is collapsed to its header bar. Kept here
   * rather than in the panel because the full-size panel's Collapse control
   * lands on the collapsed compact panel. Full-size is never collapsed.
   */
  isChatCollapsed: boolean;
  setChatCollapsed: (collapsed: boolean) => void;
  /** Whether the chat panel shows the conversation history instead of the chat. */
  chatHistoryOpen: boolean;
  setChatHistoryOpen: (open: boolean) => void;
  /**
   * Whether the Data Catalog panel is open. The Data Catalog and Areas panels
   * share the same column slot in the exploration layout and are kept mutually
   * exclusive — opening one closes the other.
   */
  dataCatalogOpen: boolean;
  setDataCatalogOpen: (open: boolean) => void;
  toggleDataCatalog: () => void;
  /**
   * Whether the Areas panel is open. Mutually exclusive with `dataCatalogOpen`
   * and `insightsPanelOpen` (same column slot).
   */
  areasPanelOpen: boolean;
  setAreasPanelOpen: (open: boolean) => void;
  toggleAreasPanel: () => void;
  /** The Areas panel's selected tab. Here so the menu can open "My areas". */
  areasPanelFilter: AreasPanelFilter;
  setAreasPanelFilter: (filter: AreasPanelFilter) => void;
  /** Opens the Areas panel on the given tab (closing its column siblings). */
  openAreasPanel: (filter: AreasPanelFilter) => void;
  /**
   * Whether the Insights panel is open. Mutually exclusive with the Data Catalog
   * and Areas panels (same column slot).
   */
  insightsPanelOpen: boolean;
  setInsightsPanelOpen: (open: boolean) => void;
  toggleInsightsPanel: () => void;
}

function updateThreadInCache(
  updater: (threads: ThreadEntry[]) => ThreadEntry[]
) {
  queryClient.setQueryData<InfiniteData<ThreadsPage>>(["threads"], (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        threads: updater(page.threads),
      })),
    };
  });
}

const useSidebarStore = create<SidebarState>(() => ({
  sideBarVisible: false,
  menuOpen: false,
  setMenuOpen: (open) => useSidebarStore.setState({ menuOpen: open }),
  apiStatus: "Idle",
  isChatFullSize: false,
  setChatFullSize: (value) =>
    useSidebarStore.setState(
      value
        ? { isChatFullSize: true, isChatCollapsed: false }
        : { isChatFullSize: false }
    ),
  isChatCollapsed: false,
  setChatCollapsed: (collapsed) =>
    useSidebarStore.setState(
      collapsed
        ? { isChatCollapsed: true, isChatFullSize: false }
        : { isChatCollapsed: false }
    ),
  chatHistoryOpen: false,
  setChatHistoryOpen: (open) =>
    useSidebarStore.setState(
      open
        ? { chatHistoryOpen: true, isChatCollapsed: false }
        : { chatHistoryOpen: false }
    ),
  dataCatalogOpen: false,
  setDataCatalogOpen: (open) =>
    useSidebarStore.setState(
      open
        ? {
            dataCatalogOpen: true,
            areasPanelOpen: false,
            insightsPanelOpen: false,
          }
        : { dataCatalogOpen: false }
    ),
  toggleDataCatalog: () =>
    useSidebarStore.setState((state) => {
      const next = !state.dataCatalogOpen;
      return next
        ? {
            dataCatalogOpen: true,
            areasPanelOpen: false,
            insightsPanelOpen: false,
          }
        : { dataCatalogOpen: false };
    }),
  areasPanelOpen: false,
  setAreasPanelOpen: (open) =>
    useSidebarStore.setState(
      open
        ? {
            areasPanelOpen: true,
            dataCatalogOpen: false,
            insightsPanelOpen: false,
          }
        : { areasPanelOpen: false }
    ),
  toggleAreasPanel: () =>
    useSidebarStore.setState((state) => {
      const next = !state.areasPanelOpen;
      return next
        ? {
            areasPanelOpen: true,
            dataCatalogOpen: false,
            insightsPanelOpen: false,
          }
        : { areasPanelOpen: false };
    }),
  areasPanelFilter: "boundaries",
  setAreasPanelFilter: (filter) =>
    useSidebarStore.setState({ areasPanelFilter: filter }),
  openAreasPanel: (filter) =>
    useSidebarStore.setState({
      areasPanelOpen: true,
      areasPanelFilter: filter,
      dataCatalogOpen: false,
      insightsPanelOpen: false,
    }),

  insightsPanelOpen: false,
  setInsightsPanelOpen: (open) =>
    useSidebarStore.setState(
      open
        ? {
            insightsPanelOpen: true,
            dataCatalogOpen: false,
            areasPanelOpen: false,
          }
        : { insightsPanelOpen: false }
    ),
  toggleInsightsPanel: () =>
    useSidebarStore.setState((state) => {
      const next = !state.insightsPanelOpen;
      return next
        ? {
            insightsPanelOpen: true,
            dataCatalogOpen: false,
            areasPanelOpen: false,
          }
        : { insightsPanelOpen: false };
    }),

  toggleSidebar: () =>
    useSidebarStore.setState((state) => ({
      sideBarVisible: !state.sideBarVisible,
    })),

  renameThread: async (threadId: string, newName: string) => {
    const response = await apiFetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (response.ok) {
      updateThreadInCache((threads) =>
        threads.map((t) => (t.id === threadId ? { ...t, name: newName } : t))
      );
    } else {
      throw new Error("Failed to rename thread");
    }
  },

  shareThread: async (threadId: string, isPublic: boolean) => {
    const response = await apiFetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: isPublic }),
    });

    if (response.ok) {
      updateThreadInCache((threads) =>
        threads.map((t) =>
          t.id === threadId ? { ...t, is_public: isPublic } : t
        )
      );
    } else {
      throw new Error("Failed to share thread");
    }
  },

  deleteThread: async (threadId: string) => {
    const response = await apiFetch(`/api/threads/${threadId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      updateThreadInCache((threads) =>
        threads.filter((t) => t.id !== threadId)
      );
    } else {
      throw new Error("Failed to delete thread");
    }
  },

  fetchApiStatus: async () => {
    try {
      const response = await fetch(`${API_CONFIG.API_HOST}/docs`);
      if (response.status === 200) {
        useSidebarStore.setState({ apiStatus: "OK" });
      } else {
        useSidebarStore.setState({ apiStatus: "Error" });
      }
    } catch {
      useSidebarStore.setState({ apiStatus: "Error" });
    }
  },
}));

export default useSidebarStore;
