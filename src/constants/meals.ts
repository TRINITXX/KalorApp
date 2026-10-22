import type { MealType } from "@/types/nutrition";

export const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: "breakfast", label: "Petit-déjeuner", icon: "sunrise" },
  { type: "lunch", label: "Déjeuner", icon: "sun.max" },
  { type: "snack", label: "Goûter", icon: "cup.and.saucer" },
  { type: "dinner", label: "Dîner", icon: "moon.stars" },
];

/** "au déjeuner", for button labels such as "Ajouter au déjeuner". */
export const MEAL_WITH_ARTICLE: Record<MealType, string> = {
  breakfast: "au petit-déjeuner",
  lunch: "au déjeuner",
  snack: "au goûter",
  dinner: "au dîner",
};
