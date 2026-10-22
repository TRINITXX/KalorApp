import { openSharedDatabase } from "@/db/client";

const mockFiles = new Set<string>();
const mockOps: string[] = [];
const mockOpened: unknown[][] = [];
const mockFlags = new Map<string, boolean>();
const mockFailure = { copy: false };
// Rows read back from the old journal and from the moved copy.
const mockRows = { legacy: { products: 12, entries: 40 }, shared: { products: 12, entries: 40 } };

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("@/modules/widget-bridge", () => ({ getSharedContainerPath: () => "/group/kalor.db" }));
jest.mock("@/db/migrations", () => ({ migrateDbIfNeeded: async () => {} }));
jest.mock("@/lib/storage/app-storage", () => ({
  mmkv: {
    getBoolean: (key: string) => mockFlags.get(key),
    set: (key: string, value: boolean) => mockFlags.set(key, value),
  },
}));
jest.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "/docs/SQLite",
  openDatabaseAsync: async (...args: unknown[]) => {
    mockOpened.push(args);
    return {
      args,
      execAsync: async () => {},
      getFirstAsync: async () => (args[2] ? mockRows.shared : mockRows.legacy),
      closeAsync: async () => {},
    };
  },
}));
jest.mock("expo-file-system", () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    rename(name: string) {
      mockOps.push(`rename ${this.uri} ${name}`);
    }
    copy(destination: { uri: string }) {
      if (mockFailure.copy) throw new Error("disk full");
      mockOps.push(`copy ${this.uri} ${destination.uri}`);
    }
  },
}));

const LEGACY = "file:///docs/SQLite/group/kalor.db";
const SHARED = "file:///group/kalor.db";

beforeEach(() => {
  mockFiles.clear();
  mockOps.length = 0;
  mockOpened.length = 0;
  mockFlags.clear();
  mockFailure.copy = false;
  mockRows.shared = { ...mockRows.legacy };
});

describe("openSharedDatabase", () => {
  it("opens the App Group file Siri writes to, never an absolute path as a name", async () => {
    const db = (await openSharedDatabase()) as unknown as { args: unknown[] };
    expect(db.args).toEqual(["kalor.db", undefined, "/group"]);
    expect(mockOpened.every(([name]) => !String(name).startsWith("/"))).toBe(true);
    expect(mockOps).toEqual([]);
    expect(mockFlags.get("db_moved_to_shared_container")).toBe(true);
  });

  it("moves the journal the app used so far, setting Siri's file aside", async () => {
    mockFiles.add(LEGACY).add(SHARED);
    const db = (await openSharedDatabase()) as unknown as { args: unknown[] };
    expect(mockOps).toEqual([
      expect.stringMatching(/^rename file:\/\/\/group\/kalor\.db kalor-before-move-\d+\.db$/),
      `copy ${LEGACY} ${SHARED}`,
      // Out of the way, so a lost flag can never move it back over newer days.
      expect.stringMatching(/^rename file:\/\/\/docs\/SQLite\/group\/kalor\.db kalor-moved-\d+\.db$/),
    ]);
    expect(db.args).toEqual(["kalor.db", undefined, "/group"]);
    expect(mockFlags.get("db_moved_to_shared_container")).toBe(true);
  });

  it("keeps the old journal when the move fails, to retry next launch", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockFiles.add(LEGACY);
    mockFailure.copy = true;
    const db = (await openSharedDatabase()) as unknown as { args: unknown[] };
    expect(db.args).toEqual(["group/kalor.db"]);
    expect(mockFlags.has("db_moved_to_shared_container")).toBe(false);
  });

  it("keeps the old journal when the copy misses entries", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockFiles.add(LEGACY);
    mockRows.shared = { products: 12, entries: 39 };
    const db = (await openSharedDatabase()) as unknown as { args: unknown[] };
    expect(db.args).toEqual(["group/kalor.db"]);
    expect(mockFlags.has("db_moved_to_shared_container")).toBe(false);
  });

  it("does not move anything again once moved", async () => {
    mockFlags.set("db_moved_to_shared_container", true);
    mockFiles.add(LEGACY);
    await openSharedDatabase();
    expect(mockOps).toEqual([]);
    expect(mockOpened).toEqual([["kalor.db", undefined, "/group"]]);
  });
});
