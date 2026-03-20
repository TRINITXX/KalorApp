import type { MealType } from "@/types/nutrition";

export const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: "breakfast", label: "Petit-dejeuner", icon: "sunrise" },
  { type: "lunch", label: "Dejeuner", icon: "sun.max" },
  { type: "snack", label: "Gouter", icon: "cup.and.saucer" },
  { type: "dinner", label: "Diner", icon: "moon.stars" },
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
