import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/storage/app-storage";
import { SETTINGS_VERSION, migrateSettings } from "@/stores/settings-migrations";
import type { Goals, MealType } from "@/types/nutrition";

export type ThemeSetting = "system" | "dark" | "light";

interface SettingsState {
  theme: ThemeSetting;
  enabledMeals: Record<MealType, boolean>;
  goals: Goals;
  setTheme: (theme: ThemeSetting) => void;
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
      theme: "system",
      enabledMeals: {
        breakfast: false,
        lunch: true,
        snack: false,
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
      version: SETTINGS_VERSION,
      migrate: (persisted, version) => migrateSettings(persisted, version) as SettingsState,
    },
  ),
);
