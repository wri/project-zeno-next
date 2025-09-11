import { create } from "zustand";
import { API_CONFIG } from "@/app/config/api";
import { showApiError } from "@/app/hooks/useErrorHandler";

interface ThreadEntry {
  agent_id: "UniGuana";
  created_at: string;
  id: string;
  name: string;
  updated_at: string;
  user_id: string;
  is_public: boolean;
}

interface ThreadGroups {
  today: ThreadEntry[];
  previousWeek: ThreadEntry[];
  older: ThreadEntry[];
}

interface SidebarState {
  sideBarVisible: boolean;
  threads: ThreadEntry[];
  threadGroups: ThreadGroups;
  fetchThreads: () => Promise<void>;
  renameThread: (threadId: string, newName: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  getThreadById: (
    threadId: string | null | undefined
  ) => ThreadEntry | undefined;
  // Function to toggle the sidebar visibility
  toggleSidebar: () => void;
  fetchApiStatus: () => Promise<void>;
  apiStatus: "Idle" | "OK" | "Error";
}

const computeThreadGroups = (data: ThreadEntry[]): ThreadGroups => {
  const threads = data.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  // Group threads by date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groupedThreads = {
    today: threads.filter((thread) => new Date(thread.created_at) >= today),
    previousWeek: threads.filter((thread) => {
      const date = new Date(thread.created_at);
      return date >= weekAgo && date < today;
    }),
    older: threads.filter((thread) => new Date(thread.created_at) < weekAgo),
  };

  return groupedThreads;
};

const useSidebarStore = create<SidebarState>((set, get) => ({
  sideBarVisible: false,
  threads: [],
  threadGroups: {
    today: [],
    previousWeek: [],
    older: [],
  },
  apiStatus: "Idle",
  toggleSidebar: () =>
    set((state) => ({ sideBarVisible: !state.sideBarVisible })),

  getThreadById: (threadId: string | null | undefined) => {
    const { threads } = get();
    return threads.find((thread) => thread.id === threadId);
  },

  fetchThreads: async () => {
    try {
      const response = await fetch("/api/threads");

      if (response.ok) {
        const data: ThreadEntry[] = await response.json();
        const groupedThreads = computeThreadGroups(data);
        set({ threadGroups: groupedThreads, threads: data });
      } else {
        showApiError("Failed to load threads.", {
          title: response.status >= 500 ? "Server Error" : "Request Error",
        });
      }
    } catch (error) {
      console.error("Error loading threads:", error);
      showApiError("Network error while loading threads.", {
        title: "Network Error",
      });
    }
  },

  renameThread: async (threadId: string, newName: string) => {
    const response = await fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newName }),
    });

    if (response.ok) {
      // Update the thread in the store
      set((state) => {
        const threads = state.threads.map((thread) =>
          thread.id === threadId ? { ...thread, name: newName } : thread
        );
        return { threads, threadGroups: computeThreadGroups(threads) };
      });
    } else {
      throw new Error("Failed to rename thread");
    }
  },

  deleteThread: async (threadId: string) => {
    const response = await fetch(`/api/threads/${threadId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      // Remove the thread from the store
      set((state) => {
        const threads = state.threads.filter(
          (thread) => thread.id !== threadId
        );
        return {
          threads,
          threadGroups: computeThreadGroups(threads),
        };
      });
    } else {
      throw new Error("Failed to delete thread");
    }
  },

  fetchApiStatus: async () => {
    try {
      const response = await fetch(`${API_CONFIG.API_HOST}/docs`);
      if (response.status === 200) {
        set({ apiStatus: "OK" });
      } else {
        set({ apiStatus: "Error" });
      }
    } catch {
      set({ apiStatus: "Error" });
    }
  },
}));

export default useSidebarStore;
