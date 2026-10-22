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

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Values stored on an entry for `quantity` grams, rounded to 0.1 so every
 * add path (add screen, edit, voice, Siri) stores the same numbers.
 */
export function entryNutrition(
  per100g: NutritionValues,
  quantity: number,
): NutritionValues {
  const n = calculateForQuantity(per100g, quantity);
  const opt = (v: number | null) => (v === null ? null : round1(v));
  return {
    calories: round1(n.calories),
    proteins: round1(n.proteins),
    carbs: round1(n.carbs),
    fats: round1(n.fats),
    fiber: opt(n.fiber),
    sugars: opt(n.sugars),
    saturated_fat: opt(n.saturated_fat),
    salt: opt(n.salt),
  };
}

/**
 * Values per 100 g recorded in an entry when it was logged. Entries are
 * snapshots: editing one must not pull in later corrections of the product.
 */
export function entryPer100g(entry: NutritionValues & { quantity: number }): NutritionValues {
  const k = entry.quantity > 0 ? 100 / entry.quantity : 0;
  const opt = (v: number | null) => (v === null ? null : v * k);
  return {
    calories: entry.calories * k,
    proteins: entry.proteins * k,
    carbs: entry.carbs * k,
    fats: entry.fats * k,
    fiber: opt(entry.fiber),
    sugars: opt(entry.sugars),
    saturated_fat: opt(entry.saturated_fat),
    salt: opt(entry.salt),
  };
}

/** Grams with at most one decimal: "2,5", "3", "0,4". */
export function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/** French number formatting: comma decimal, narrow no-break thousands. */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
      csvCell(e.product_name),
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
