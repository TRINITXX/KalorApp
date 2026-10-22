import type { SQLiteDatabase } from "expo-sqlite";

import { addEntry } from "@/db/queries/entries";
import { updateLastQuantity } from "@/db/queries/products";
import { entryNutrition } from "@/lib/nutrition-utils";
import { productRowToNutrition } from "@/lib/product-utils";
import type { ProductRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

export interface FoodToLog {
  product: ProductRow;
  quantity: number;
}

/**
 * Writes one entry per food in a single transaction, and remembers each
 * quantity as the product's last one. Every add path goes through here.
 */
export async function logFoods(
  db: SQLiteDatabase,
  foods: FoodToLog[],
  date: string,
  meal: MealType,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const { product, quantity } of foods) {
      await addEntry(db, {
        product_id: product.id,
        product_name: product.name,
        meal,
        quantity,
        date,
        ...entryNutrition(productRowToNutrition(product), quantity),
      });
      await updateLastQuantity(db, product.id, quantity);
    }
  });
}
