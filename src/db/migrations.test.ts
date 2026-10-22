import { migrateDbIfNeeded } from "@/db/migrations";

function fakeDb(userVersion: number) {
  const statements: string[] = [];
  return {
    statements,
    execAsync: async (sql: string) => {
      statements.push(sql.trim());
    },
    getFirstAsync: async () => ({ user_version: userVersion }) as never,
  };
}

describe("migrateDbIfNeeded", () => {
  it("creates a fresh database without re-adding columns already in the schema", async () => {
    const db = fakeDb(0);
    await migrateDbIfNeeded(db);
    expect(db.statements.some((s) => s.startsWith("ALTER TABLE"))).toBe(false);
    expect(db.statements.some((s) => s.includes("CREATE TABLE IF NOT EXISTS products"))).toBe(true);
  });

  it("adds the missing columns to a database from version 1", async () => {
    const db = fakeDb(1);
    await migrateDbIfNeeded(db);
    expect(db.statements.filter((s) => s.startsWith("ALTER TABLE"))).toEqual([
      "ALTER TABLE favorites ADD COLUMN quantity REAL",
      "ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'side'",
    ]);
  });
});
