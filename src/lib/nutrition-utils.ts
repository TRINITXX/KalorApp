import { MEAL_TIME_RANGES } from "@/constants/meals";
import type { NutritionValues, MealType } from "@/types/nutrition";

export function calculateForQuantity(
  per100g: NutritionValues,
  quantity: number,
): NutritionValues {
  const factor = quantity / 100;
  return {
    calories: per100g.calories * factor,
    proteins: per100g.proteins * factor,
    carbs: per100g.carbs * factor,
    fats: per100g.fats * factor,
    fiber: per100g.fiber !== null ? per100g.fiber * factor : null,
    sugars: per100g.sugars !== null ? per100g.sugars * factor : null,
    saturated_fat:
      per100g.saturated_fat !== null ? per100g.saturated_fat * factor : null,
    salt: per100g.salt !== null ? per100g.salt * factor : null,
  };
}

export function formatNumber(value: number, decimals: number = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getMealForTime(hour: number): MealType {
  return hour < 17 ? "lunch" : "dinner";
}

export function exportEntriesCsv(
  entries: {
    date: string;
    meal: MealType;
    product_name: string;
    quantity: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fiber: number | null;
    sugars: number | null;
    saturated_fat: number | null;
    salt: number | null;
  }[],
): string {
  const header =
    "date,meal,product_name,quantity_g,calories,proteins,carbs,fats,fiber,sugars,saturated_fat,salt";
  const rows = entries.map((e) =>
    [
      e.date,
      e.meal,
      `"${e.product_name}"`,
      e.quantity,
      e.calories,
      e.proteins,
      e.carbs,
      e.fats,
      e.fiber ?? "",
      e.sugars ?? "",
      e.saturated_fat ?? "",
      e.salt ?? "",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
