import type { MealType } from "@/types/nutrition";

export const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: "breakfast", label: "Petit-déjeuner", icon: "sunrise" },
  { type: "lunch", label: "Déjeuner", icon: "sun.max" },
  { type: "snack", label: "Goûter", icon: "cup.and.saucer" },
  { type: "dinner", label: "Dîner", icon: "moon.stars" },
];

export const MEAL_TIME_RANGES: Record<
  MealType,
  { start: number; end: number }
> = {
  breakfast: { start: 5, end: 10 },
  lunch: { start: 10, end: 17 },
  snack: { start: -1, end: -1 },
  dinner: { start: 17, end: 24 },
};
