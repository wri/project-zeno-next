import { create } from "zustand";

interface ProfileNudgeState {
  /** The lighter, later ask above the chat input (the session's 5th answer). */
  bannerOpen: boolean;
  openBanner: () => void;
  closeBanner: () => void;
}

/** UI state of the profile banner; lives for the page, not across reloads. */
const useProfileNudgeStore = create<ProfileNudgeState>()((set) => ({
  bannerOpen: false,
  openBanner: () => set({ bannerOpen: true }),
  closeBanner: () => set({ bannerOpen: false }),
}));

export default useProfileNudgeStore;
