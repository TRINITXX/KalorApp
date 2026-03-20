import type { SQLiteDatabase } from "expo-sqlite";

import {
  CREATE_ENTRIES_TABLE,
  CREATE_FAVORITES_TABLE,
  CREATE_INDEXES,
  CREATE_PRODUCTS_TABLE,
} from "./schema";

const CURRENT_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync("PRAGMA journal_mode = 'wal';");

  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= CURRENT_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(CREATE_PRODUCTS_TABLE);
    await db.execAsync(CREATE_ENTRIES_TABLE);
    await db.execAsync(CREATE_FAVORITES_TABLE);
    await db.execAsync(CREATE_INDEXES);
  }

  if (currentVersion < 2) {
    await db.execAsync("ALTER TABLE favorites ADD COLUMN quantity REAL");
  }

  await db.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
