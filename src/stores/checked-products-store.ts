import { create } from "zustand";

/**
 * Products picked on a screen pushed above the add screen (scan, online
 * search, manual creation). The add screen takes them when it gets focus
 * back and selects them.
 */
interface CheckedProductsState {
  ids: string[];
  pick: (ids: string[]) => void;
  take: () => string[];
}

export const useCheckedProductsStore = create<CheckedProductsState>((set, get) => ({
  ids: [],
  pick: (ids) => set((s) => ({ ids: [...s.ids, ...ids.filter((id) => !s.ids.includes(id))] })),
  take: () => {
    const ids = get().ids;
    if (ids.length > 0) set({ ids: [] });
    return ids;
  },
}));
