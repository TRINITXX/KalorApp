import { openSharedDatabase } from "@/db/client";

const mockFiles = new Set<string>();
const mockOps: string[] = [];
const mockOpened: string[] = [];
const mockFlags = new Map<string, boolean>();
const mockState = { container: "/group/kalor.db" as string | null, copyFails: false, flagFails: false };
// Rows read back from the old journal and from the moved copy.
const mockRows = { legacy: { products: 12, entries: 40 }, shared: { products: 12, entries: 40 } };

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("@/modules/widget-bridge", () => ({ getSharedContainerPath: () => mockState.container }));
jest.mock("@/db/migrations", () => ({ migrateDbIfNeeded: async () => {} }));
jest.mock("@/lib/storage/app-storage", () => ({
  mmkv: {
    getBoolean: (key: string) => mockFlags.get(key),
    set: (key: string, value: boolean) => {
      if (mockState.flagFails) throw new Error("storage full");
      mockFlags.set(key, value);
    },
  },
}));
jest.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "/docs/SQLite",
  // Same file resolution as expo-sqlite's createDatabasePath.
  openDatabaseAsync: async (name: string, _options: unknown, directory?: string) => {
    const path = `${directory ?? "/docs/SQLite"}/${name}`;
    mockOpened.push(path);
    return {
      path,
      execAsync: async () => {},
      getFirstAsync: async () => (directory ? mockRows.shared : mockRows.legacy),
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
      mockFiles.delete(this.uri);
      mockFiles.add(this.uri.slice(0, this.uri.lastIndexOf("/") + 1) + name);
    }
    copy(destination: { uri: string }) {
      if (mockState.copyFails) throw new Error("disk full");
      mockOps.push(`copy ${this.uri} ${destination.uri}`);
      mockFiles.add(destination.uri);
    }
  },
}));

const LEGACY = "file:///docs/SQLite/kalor.db";
const SHARED = "file:///group/kalor.db";
const open = async () => ((await openSharedDatabase()) as unknown as { path: string }).path;

beforeEach(() => {
  mockFiles.clear();
  mockOps.length = 0;
  mockOpened.length = 0;
  mockFlags.clear();
  Object.assign(mockState, { container: "/group/kalor.db", copyFails: false, flagFails: false });
  mockRows.legacy = { products: 12, entries: 40 };
  mockRows.shared = { ...mockRows.legacy };
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("openSharedDatabase", () => {
  it("opens the App Group file Siri writes to", async () => {
    expect(await open()).toBe("/group/kalor.db");
    expect(mockOps).toEqual([]);
    expect(mockFlags.get("db_moved_to_shared_container")).toBe(true);
  });

  it("copies the very file the app used before the bridge was linked", async () => {
    mockState.container = null;
    const before = await open();
    mockState.container = "/group/kalor.db";
    mockFiles.add(`file://${before}`);
    await open();
    expect(mockOps).toContain(`copy file://${before} ${SHARED}`);
  });

  it("moves the old journal, setting the container's file aside", async () => {
    mockFiles.add(LEGACY).add(SHARED);
    expect(await open()).toBe("/group/kalor.db");
    expect(mockOps).toEqual([
      expect.stringMatching(/^rename file:\/\/\/group\/kalor\.db kalor-before-move-\d+\.db$/),
      `copy ${LEGACY} ${SHARED}`,
      // Out of the way, so a lost flag can never move it back over newer days.
      expect.stringMatching(/^rename file:\/\/\/docs\/SQLite\/kalor\.db kalor-moved-\d+\.db$/),
    ]);
    expect(mockFlags.get("db_moved_to_shared_container")).toBe(true);
  });

  it("keeps the old journal when the copy fails, to retry next launch", async () => {
    mockFiles.add(LEGACY);
    mockState.copyFails = true;
    expect(await open()).toBe("/docs/SQLite/kalor.db");
    expect(mockFlags.has("db_moved_to_shared_container")).toBe(false);
  });

  it("sets a copy missing entries aside, so Siri does not write where the app does not read", async () => {
    mockFiles.add(LEGACY);
    mockRows.shared = { products: 12, entries: 39 };
    expect(await open()).toBe("/docs/SQLite/kalor.db");
    expect(mockOps).toContainEqual(
      expect.stringMatching(/^rename file:\/\/\/group\/kalor\.db kalor-failed-move-\d+\.db$/),
    );
    expect(mockFiles.has(SHARED)).toBe(false);
  });

  it("opens the container when only the flag could not be saved", async () => {
    mockFiles.add(LEGACY);
    mockState.flagFails = true;
    expect(await open()).toBe("/group/kalor.db");
    // Opened once for the checkpoint, never after its rename: that would create an empty journal.
    expect(mockOpened.filter((path) => path === "/docs/SQLite/kalor.db")).toHaveLength(1);
  });

  it("never replaces the container's journal with an empty old one", async () => {
    mockFiles.add(LEGACY).add(SHARED);
    mockRows.legacy = { products: 0, entries: 0 };
    expect(await open()).toBe("/group/kalor.db");
    expect(mockOps).toEqual([
      expect.stringMatching(/^rename file:\/\/\/docs\/SQLite\/kalor\.db kalor-moved-\d+\.db$/),
    ]);
  });

  it("does not move anything again once moved", async () => {
    mockFlags.set("db_moved_to_shared_container", true);
    mockFiles.add(LEGACY);
    await open();
    expect(mockOps).toEqual([]);
    expect(mockOpened).toEqual(["/group/kalor.db"]);
  });
});
