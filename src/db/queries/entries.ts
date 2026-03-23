import type { SQLiteDatabase } from "expo-sqlite";

import type { EntryRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

export interface AddEntryParams {
  product_id: string;
  product_name: string;
  meal: MealType;
  quantity: number;
  date: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number | null;
  sugars: number | null;
  saturated_fat: number | null;
  salt: number | null;
}

export async function addEntry(
  db: SQLiteDatabase,
  entry: AddEntryParams,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO entries (product_id, product_name, meal, quantity, date, calories, proteins, carbs, fats, fiber, sugars, saturated_fat, salt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.product_id,
    entry.product_name,
    entry.meal,
    entry.quantity,
    entry.date,
    entry.calories,
    entry.proteins,
    entry.carbs,
    entry.fats,
    entry.fiber,
    entry.sugars,
    entry.saturated_fat,
    entry.salt,
  );
  import("@/lib/widget-sync")
    .then((m) => m.syncWidgetData(db))
    .catch(console.warn);
  return result.lastInsertRowId;
}

export async function updateEntry(
  db: SQLiteDatabase,
  id: number,
  entry: Omit<AddEntryParams, "product_id" | "product_name" | "date">,
): Promise<void> {
  await db.runAsync(
    `UPDATE entries SET meal = ?, quantity = ?, calories = ?, proteins = ?, carbs = ?, fats = ?, fiber = ?, sugars = ?, saturated_fat = ?, salt = ? WHERE id = ?`,
    entry.meal,
    entry.quantity,
    entry.calories,
    entry.proteins,
    entry.carbs,
    entry.fats,
    entry.fiber,
    entry.sugars,
    entry.saturated_fat,
    entry.salt,
    id,
  );
  import("@/lib/widget-sync")
    .then((m) => m.syncWidgetData(db))
    .catch(console.warn);
}

export async function deleteEntry(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM entries WHERE id = ?", id);
  import("@/lib/widget-sync")
    .then((m) => m.syncWidgetData(db))
    .catch(console.warn);
}

export async function getEntriesByDate(
  db: SQLiteDatabase,
  date: string,
): Promise<EntryRow[]> {
  return db.getAllAsync<EntryRow>(
    "SELECT * FROM entries WHERE date = ? ORDER BY product_name ASC",
    date,
  );
}

export interface DailySummaryRow {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugars: number;
  saturated_fat: number;
  salt: number;
}

export async function getDailySummary(
  db: SQLiteDatabase,
  date: string,
): Promise<DailySummaryRow> {
  const result = await db.getFirstAsync<DailySummaryRow>(
    `SELECT COALESCE(SUM(calories),0) as calories, COALESCE(SUM(proteins),0) as proteins,
      COALESCE(SUM(carbs),0) as carbs, COALESCE(SUM(fats),0) as fats,
      COALESCE(SUM(fiber),0) as fiber, COALESCE(SUM(sugars),0) as sugars,
      COALESCE(SUM(saturated_fat),0) as saturated_fat, COALESCE(SUM(salt),0) as salt
     FROM entries WHERE date = ?`,
    date,
  );
  return (
    result ?? {
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sugars: 0,
      saturated_fat: 0,
      salt: 0,
    }
  );
}

export async function getWeeklyTotals(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<
  {
    date: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
  }[]
> {
  return db.getAllAsync(
    `SELECT date, COALESCE(SUM(calories),0) as calories, COALESCE(SUM(proteins),0) as proteins,
    COALESCE(SUM(carbs),0) as carbs, COALESCE(SUM(fats),0) as fats
   FROM entries WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date ASC`,
    startDate,
    endDate,
  );
}

export async function getWeeklySummaries(
  db: SQLiteDatabase,
  weeks: number,
): Promise<{ week_start: string; total_calories: number }[]> {
  return db.getAllAsync(
    `SELECT date(date,'weekday 0','-6 days') as week_start, COALESCE(SUM(calories),0) as total_calories
   FROM entries WHERE date >= date('now','-'||?||' days') GROUP BY week_start ORDER BY week_start DESC`,
    weeks * 7,
  );
}

export async function getAllEntriesForExport(
  db: SQLiteDatabase,
): Promise<EntryRow[]> {
  return db.getAllAsync<EntryRow>(
    "SELECT * FROM entries ORDER BY date ASC, created_at ASC",
  );
}
