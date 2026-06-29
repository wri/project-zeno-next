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
  // [PROTOTYPE] Tracks whether the floating compact panel is at its default
  // bottom-left position (x=0, y=0). MapAreaControls reads this to shift the
  // zoom/basemap controls to the left when the panel has been dragged away.
  isChatPanelAtHome: boolean;
  setChatPanelAtHome: (value: boolean) => void;
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
  isChatPanelAtHome: true,
  setChatPanelAtHome: (value) =>
    useSidebarStore.setState({ isChatPanelAtHome: value }),

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
