import type { ProductRow } from "@/types/database";
import type { NutritionValues, Product } from "@/types/nutrition";

export function flattenProductForDb(
  product: Omit<Product, "created_at">,
): Omit<ProductRow, "created_at"> {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    image_url: product.image_url,
    source: product.source,
    calories: product.nutrition_per_100g.calories,
    proteins: product.nutrition_per_100g.proteins,
    carbs: product.nutrition_per_100g.carbs,
    fats: product.nutrition_per_100g.fats,
    fiber: product.nutrition_per_100g.fiber,
    sugars: product.nutrition_per_100g.sugars,
    saturated_fat: product.nutrition_per_100g.saturated_fat,
    salt: product.nutrition_per_100g.salt,
    last_quantity: product.last_quantity,
  };
}

export function productRowToNutrition(row: ProductRow): NutritionValues {
  return {
    calories: row.calories,
    proteins: row.proteins,
    carbs: row.carbs,
    fats: row.fats,
    fiber: row.fiber,
    sugars: row.sugars,
    saturated_fat: row.saturated_fat,
    salt: row.salt,
  };
}

export function formatDateISO(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
