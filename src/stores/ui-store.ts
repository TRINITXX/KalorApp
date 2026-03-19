import { create } from "zustand";

interface UIState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const today = () => new Date().toISOString().split("T")[0];

export const useUIStore = create<UIState>()((set) => ({
  selectedDate: today(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
