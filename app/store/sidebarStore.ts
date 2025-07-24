import { create } from "zustand";

interface ThreadEntry {
  agent_id: "UniGuana";
  created_at: string;
  id: string;
  updated_at: string;
  user_id: string;
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
  // Function to toggle the sidebar visibility
  toggleSidebar: () => void;
  fetchApiStatus: () => Promise<void>;
  apiStatus: "Idle" | "OK" | "Error";
}

const useSidebarStore = create<SidebarState>((set) => ({
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

  fetchThreads: async () => {
    const response = await fetch("/api/threads");

    if (response.ok) {
      const data: ThreadEntry[] = await response.json();

      // Group threads by date
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const groupedThreads = {
        today: data.filter((thread) => new Date(thread.created_at) >= today),
        previousWeek: data.filter((thread) => {
          const date = new Date(thread.created_at);
          return date >= weekAgo && date < today;
        }),
        older: data.filter((thread) => new Date(thread.created_at) < weekAgo),
      };

      set({ threadGroups: groupedThreads, threads: data });
    }
  },

  fetchApiStatus: async () => {
    try {
      const response = await fetch("https://api.zeno-staging.ds.io/docss"); // shouldn't hard code this
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
