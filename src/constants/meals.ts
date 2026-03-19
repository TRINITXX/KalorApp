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
  breakfast: { start: 0, end: 11 },
  lunch: { start: 11, end: 14 },
  snack: { start: 14, end: 17 },
  dinner: { start: 17, end: 24 },
};
