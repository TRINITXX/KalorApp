import type { SQLiteDatabase } from "expo-sqlite";

import type { ProductRow } from "@/types/database";

export async function upsertProduct(
  db: SQLiteDatabase,
  product: Omit<ProductRow, "created_at">,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO products (id, name, brand, image_url, source, calories, proteins, carbs, fats, fiber, sugars, saturated_fat, salt, last_quantity, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, brand = excluded.brand, image_url = excluded.image_url,
       calories = excluded.calories, proteins = excluded.proteins, carbs = excluded.carbs,
       fats = excluded.fats, fiber = excluded.fiber, sugars = excluded.sugars,
       saturated_fat = excluded.saturated_fat, salt = excluded.salt, last_quantity = excluded.last_quantity,
       category = excluded.category`,
    product.id,
    product.name,
    product.brand,
    product.image_url,
    product.source,
    product.calories,
    product.proteins,
    product.carbs,
    product.fats,
    product.fiber,
    product.sugars,
    product.saturated_fat,
    product.salt,
    product.last_quantity,
    product.category,
  );
}

export async function getProduct(
  db: SQLiteDatabase,
  id: string,
): Promise<ProductRow | null> {
  return db.getFirstAsync<ProductRow>(
    "SELECT * FROM products WHERE id = ?",
    id,
  );
}

export async function getRecentProducts(
  db: SQLiteDatabase,
  limit: number = 10,
): Promise<ProductRow[]> {
  return db.getAllAsync<ProductRow>(
    `SELECT DISTINCT p.* FROM products p INNER JOIN entries e ON e.product_id = p.id ORDER BY e.created_at DESC LIMIT ?`,
    limit,
  );
}

export async function updateLastQuantity(
  db: SQLiteDatabase,
  productId: string,
  quantity: number,
): Promise<void> {
  await db.runAsync(
    "UPDATE products SET last_quantity = ? WHERE id = ?",
    quantity,
    productId,
  );
}
