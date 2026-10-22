import type { SQLiteDatabase } from "expo-sqlite";

import type { ProductRow } from "@/types/database";

const PRODUCT_COLUMNS = [
  "id",
  "name",
  "brand",
  "image_url",
  "source",
  "calories",
  "proteins",
  "carbs",
  "fats",
  "fiber",
  "sugars",
  "saturated_fat",
  "salt",
  "last_quantity",
  "category",
] as const satisfies readonly (keyof ProductRow)[];

// Built from one column list so the update can never skip a column the insert writes.
export const UPSERT_PRODUCT_SQL = `INSERT INTO products (${PRODUCT_COLUMNS.join(", ")})
  VALUES (${PRODUCT_COLUMNS.map(() => "?").join(", ")})
  ON CONFLICT(id) DO UPDATE SET ${PRODUCT_COLUMNS.filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ")}`;

export async function upsertProduct(
  db: SQLiteDatabase,
  product: Omit<ProductRow, "created_at">,
): Promise<void> {
  await db.runAsync(UPSERT_PRODUCT_SQL, ...PRODUCT_COLUMNS.map((c) => product[c]));
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

export interface CatalogProduct extends ProductRow {
  is_favorite: 0 | 1;
  favorite_quantity: number | null;
}

/** Every known product, flagged when it is a favorite, in French alphabetical order. */
export async function getCatalog(db: SQLiteDatabase): Promise<CatalogProduct[]> {
  const rows = await db.getAllAsync<CatalogProduct>(
    `SELECT p.*, (f.product_id IS NOT NULL) AS is_favorite, f.quantity AS favorite_quantity
     FROM products p LEFT JOIN favorites f ON f.product_id = p.id`,
  );
  // SQLite sorts "Pâtes" after "Pommes": accents need a French collation.
  return rows.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

/** Usual portion: the favorite's quantity, else the last one eaten, else 100 g. */
export function defaultPortion(p: {
  favorite_quantity: number | null;
  last_quantity: number | null;
}): number {
  return p.favorite_quantity || p.last_quantity || 100;
}
