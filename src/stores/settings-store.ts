import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/storage/app-storage";
import type { Goals, MealType } from "@/types/nutrition";

interface SettingsState {
  theme: "dark" | "light";
  enabledMeals: Record<MealType, boolean>;
  goals: Goals;
  setTheme: (theme: "dark" | "light") => void;
  toggleMeal: (meal: MealType) => void;
  setGoals: (goals: Partial<Goals>) => void;
}

const DEFAULT_GOALS: Goals = {
  calories: 2100,
  proteins: 120,
  carbs: 260,
  fats: 70,
  fiber: null,
  sugars: null,
  saturated_fat: null,
  salt: null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      enabledMeals: {
        breakfast: false,
        lunch: true,
        snack: true,
        dinner: true,
      },
      goals: DEFAULT_GOALS,
      setTheme: (theme) => set({ theme }),
      toggleMeal: (meal) =>
        set((state) => ({
          enabledMeals: {
            ...state.enabledMeals,
            [meal]: !state.enabledMeals[meal],
          },
        })),
      setGoals: (goals) =>
        set((state) => ({
          goals: { ...state.goals, ...goals },
        })),
    }),
    {
      name: "kalor-settings",
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
