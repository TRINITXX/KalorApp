import type { SQLiteDatabase } from "expo-sqlite";

import type { ProductRow } from "@/types/database";

export interface FavoriteWithProduct extends ProductRow {
  sort_order: number;
  favorite_quantity: number | null;
}

export async function addFavorite(
  db: SQLiteDatabase,
  productId: string,
): Promise<void> {
  await db.runAsync(
    "INSERT OR IGNORE INTO favorites (product_id, sort_order) VALUES (?, COALESCE((SELECT MAX(sort_order) FROM favorites), -1) + 1)",
    productId,
  );
}

export async function removeFavorite(
  db: SQLiteDatabase,
  productId: string,
): Promise<void> {
  await db.runAsync("DELETE FROM favorites WHERE product_id = ?", productId);
}

export async function getFavorites(
  db: SQLiteDatabase,
): Promise<FavoriteWithProduct[]> {
  return db.getAllAsync<FavoriteWithProduct>(
    `SELECT p.*, f.sort_order, f.quantity AS favorite_quantity FROM favorites f INNER JOIN products p ON p.id = f.product_id ORDER BY f.sort_order ASC`,
  );
}

export async function isFavorite(
  db: SQLiteDatabase,
  productId: string,
): Promise<boolean> {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM favorites WHERE product_id = ?",
    productId,
  );
  return (result?.count ?? 0) > 0;
}

export async function getFavoriteQuantity(
  db: SQLiteDatabase,
  productId: string,
): Promise<number | null> {
  const result = await db.getFirstAsync<{ quantity: number | null }>(
    "SELECT quantity FROM favorites WHERE product_id = ?",
    productId,
  );
  return result?.quantity ?? null;
}

export async function updateFavoriteQuantity(
  db: SQLiteDatabase,
  productId: string,
  quantity: number | null,
): Promise<void> {
  await db.runAsync(
    "UPDATE favorites SET quantity = ? WHERE product_id = ?",
    quantity,
    productId,
  );
}

export async function reorderFavorites(
  db: SQLiteDatabase,
  orderedProductIds: string[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedProductIds.length; i++) {
      await db.runAsync(
        "UPDATE favorites SET sort_order = ? WHERE product_id = ?",
        i,
        orderedProductIds[i],
      );
    }
  });
}
