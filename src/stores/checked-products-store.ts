import { create } from "zustand";

interface CheckedProductsState {
  ids: string[];
  setIds: (ids: string[]) => void;
  clear: () => void;
}

export const useCheckedProductsStore = create<CheckedProductsState>((set) => ({
  ids: [],
  setIds: (ids) => set({ ids }),
  clear: () => set({ ids: [] }),
}));
