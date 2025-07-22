import { create } from "zustand";

interface UploadStoreState {
  dialogVisible: boolean;
  toggleUploadAreaDialog: () => void;
}

const useUploadStore = create<UploadStoreState>((set) => ({
  dialogVisible: false,
  toggleUploadAreaDialog: () =>
    set((state) => ({ dialogVisible: !state.dialogVisible })),
}));

export default useUploadStore;
