import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { migrateDbIfNeeded } from "./migrations";
import { getSharedContainerPath } from "@/modules/widget-bridge";
import { mmkv } from "@/lib/storage/app-storage";

export const DATABASE_NAME = "kalor.db";

const MIGRATION_KEY = "db_migrated_to_appgroup";

export async function openSharedDatabase(): Promise<SQLiteDatabase> {
  const sharedPath = Platform.OS === "ios" ? getSharedContainerPath() : null;

  if (!sharedPath) {
    const db = await openDatabaseAsync(DATABASE_NAME);
    await migrateDbIfNeeded(db);
    return db;
  }

  const alreadyMigrated = mmkv.getBoolean(MIGRATION_KEY) ?? false;

  if (!alreadyMigrated) {
    try {
      const oldDb = await openDatabaseAsync(DATABASE_NAME);
      const result = await oldDb.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='products'",
      );

      if (result && result.count > 0) {
        await oldDb.execAsync("PRAGMA wal_checkpoint(TRUNCATE)");
        await oldDb.closeAsync();

        const oldFile = new File(Paths.document, DATABASE_NAME);

        if (oldFile.exists) {
          oldFile.copy(new File(sharedPath));

          const newDb = await openDatabaseAsync(sharedPath);
          const verify = await newDb.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM products",
          );

          if (verify && verify.count >= 0) {
            mmkv.set(MIGRATION_KEY, true);
            await migrateDbIfNeeded(newDb);
            return newDb;
          }

          await newDb.closeAsync();
        }
      } else {
        await oldDb.closeAsync();
      }
    } catch {
      // Migration failed -- continue with shared path (fresh DB)
    }
  }

  const db = await openDatabaseAsync(sharedPath);
  await migrateDbIfNeeded(db);

  if (!alreadyMigrated) {
    mmkv.set(MIGRATION_KEY, true);
  }

  return db;
}
