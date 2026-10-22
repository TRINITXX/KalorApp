import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { File } from "expo-file-system";
import { Platform } from "react-native";

import { migrateDbIfNeeded } from "./migrations";
import { getSharedContainerPath } from "@/modules/widget-bridge";
import { mmkv } from "@/lib/storage/app-storage";

export const DATABASE_NAME = "kalor.db";

const MOVED_KEY = "db_moved_to_shared_container";

const fileUri = (path: string) => `file://${encodeURI(path)}`;

/**
 * Opens the journal in the App Group container: the file the widget and Siri
 * (targets/widget/SQLiteHelper.swift) read and write.
 *
 * Up to build 1.1.0 the app passed the container path as the database *name*.
 * expo-sqlite put it under its own folder, so the app kept a private journal
 * at <Documents>/SQLite/<container path>/kalor.db that Siri never saw. That
 * journal holds the user's data: it is moved once into the container.
 */
export async function openSharedDatabase(): Promise<SQLiteDatabase> {
  const sharedPath = Platform.OS === "ios" ? getSharedContainerPath() : null;

  if (!sharedPath) {
    const db = await openDatabaseAsync(DATABASE_NAME);
    await migrateDbIfNeeded(db);
    return db;
  }

  const containerDir = sharedPath.slice(0, sharedPath.lastIndexOf("/"));
  // The name the old code ended up using, relative to the default folder.
  const legacyName = sharedPath.replace(/^\/+/, "");

  if (!mmkv.getBoolean(MOVED_KEY)) {
    try {
      await moveLegacyJournal(legacyName, sharedPath, containerDir);
      mmkv.set(MOVED_KEY, true);
    } catch (error) {
      // Better the old journal than an empty one: the move is retried next launch.
      console.warn("Journal move to the App Group failed", error);
      const legacy = await openDatabaseAsync(legacyName);
      await migrateDbIfNeeded(legacy);
      return legacy;
    }
  }

  const db = await openDatabaseAsync(DATABASE_NAME, undefined, containerDir);
  await migrateDbIfNeeded(db);
  return db;
}

async function moveLegacyJournal(legacyName: string, sharedPath: string, containerDir: string) {
  const legacyFile = new File(fileUri(`${defaultDatabaseDirectory}/${legacyName}`));
  if (!legacyFile.exists) return;

  const legacy = await openDatabaseAsync(legacyName);
  let before: string;
  try {
    // Folds the WAL into the main file so a plain copy holds every row.
    await legacy.execAsync("PRAGMA wal_checkpoint(TRUNCATE)");
    before = await countRows(legacy);
  } finally {
    await legacy.closeAsync();
  }

  // What Siri wrote so far (test dictations) is set aside, never deleted.
  // A dictation saving during these few milliseconds lands in that file: accepted.
  const stamp = Date.now();
  setAside(sharedPath, `kalor-before-move-${stamp}.db`);
  legacyFile.copy(new File(fileUri(sharedPath)));

  const moved = await openDatabaseAsync(DATABASE_NAME, undefined, containerDir);
  try {
    if ((await countRows(moved)) !== before) throw new Error("Rows lost in the move");
  } finally {
    await moved.closeAsync();
  }

  // Renamed rather than left in place: should the flag ever be lost, a second
  // move would otherwise bring the journal back to this day. The move itself
  // is done by now, so a failure here must not send the app back to the old file.
  try {
    setAside(`${defaultDatabaseDirectory}/${legacyName}`, `kalor-moved-${stamp}.db`);
  } catch (error) {
    console.warn("Old journal left in place", error);
  }
}

/**
 * Renames a database file and its WAL companions in their folder. The main
 * file goes last: a stale WAL left next to a new copy would be replayed into it.
 */
function setAside(path: string, newName: string) {
  for (const suffix of ["-wal", "-shm", ""]) {
    const file = new File(fileUri(path + suffix));
    if (file.exists) file.rename(newName + suffix);
  }
}

async function countRows(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ products: number; entries: number }>(
    "SELECT (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM entries) AS entries",
  );
  return `${row?.products}/${row?.entries}`;
}
