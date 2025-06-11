import { create } from "zustand";

interface SidebarState {
  sideBarVisible: boolean;
  toggleSidebar: () => void;
}

const useSidebarStore = create<SidebarState>((set) => ({
  sideBarVisible: false,
  toggleSidebar: () =>
    set((state) => ({ sideBarVisible: !state.sideBarVisible })),
}));

export default useSidebarStore; 