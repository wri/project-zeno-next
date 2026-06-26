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

interface SidebarState {
  sideBarVisible: boolean;
  toggleSidebar: () => void;
  renameThread: (threadId: string, newName: string) => Promise<void>;
  shareThread: (threadId: string, isPublic: boolean) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  fetchApiStatus: () => Promise<void>;
  apiStatus: "Idle" | "OK" | "Error";
  isChatFullSize: boolean;
  setChatFullSize: (value: boolean) => void;
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
   * (same column slot).
   */
  areasPanelOpen: boolean;
  setAreasPanelOpen: (open: boolean) => void;
  toggleAreasPanel: () => void;
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
  apiStatus: "Idle",
  isChatFullSize: false,
  setChatFullSize: (value) =>
    useSidebarStore.setState({ isChatFullSize: value }),
  dataCatalogOpen: false,
  setDataCatalogOpen: (open) =>
    useSidebarStore.setState(
      open
        ? { dataCatalogOpen: true, areasPanelOpen: false }
        : { dataCatalogOpen: false }
    ),
  toggleDataCatalog: () =>
    useSidebarStore.setState((state) => {
      const next = !state.dataCatalogOpen;
      return next
        ? { dataCatalogOpen: true, areasPanelOpen: false }
        : { dataCatalogOpen: false };
    }),
  areasPanelOpen: false,
  setAreasPanelOpen: (open) =>
    useSidebarStore.setState(
      open
        ? { areasPanelOpen: true, dataCatalogOpen: false }
        : { areasPanelOpen: false }
    ),
  toggleAreasPanel: () =>
    useSidebarStore.setState((state) => {
      const next = !state.areasPanelOpen;
      return next
        ? { areasPanelOpen: true, dataCatalogOpen: false }
        : { areasPanelOpen: false };
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
