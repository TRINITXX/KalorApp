import { guessMeal, parseSqliteUtc } from "@/lib/meal-rule";

const at = (iso: string) => new Date(iso);

describe("guessMeal", () => {
  it("puts the first food of the day in lunch", () => {
    expect(guessMeal([], { isToday: true, now: at("2026-10-22T21:00:00Z") })).toBe(
      "lunch",
    );
  });

  it("keeps a forgotten dessert added within 2 hours in lunch", () => {
    const entries = [{ meal: "lunch" as const, created_at: "2026-10-22 11:00:00" }];
    expect(
      guessMeal(entries, { isToday: true, now: at("2026-10-22T12:30:00Z") }),
    ).toBe("lunch");
  });

  it("switches to dinner 2 hours after the last lunch item", () => {
    const entries = [
      { meal: "lunch" as const, created_at: "2026-10-22 10:00:00" },
      { meal: "lunch" as const, created_at: "2026-10-22 11:00:00" },
    ];
    expect(
      guessMeal(entries, { isToday: true, now: at("2026-10-22T13:00:00Z") }),
    ).toBe("dinner");
  });

  it("stays in dinner once dinner has started", () => {
    const entries = [{ meal: "dinner" as const, created_at: "2026-10-22 19:00:00" }];
    expect(
      guessMeal(entries, { isToday: true, now: at("2026-10-22T19:10:00Z") }),
    ).toBe("dinner");
  });

  it("ignores snacks when guessing", () => {
    const entries = [{ meal: "snack" as const, created_at: "2026-10-22 15:00:00" }];
    expect(
      guessMeal(entries, { isToday: true, now: at("2026-10-22T15:10:00Z") }),
    ).toBe("lunch");
  });

  it("uses lunch then dinner on a past day, whatever the clock says", () => {
    const entries = [{ meal: "lunch" as const, created_at: "2026-10-21 11:00:00" }];
    expect(
      guessMeal(entries, { isToday: false, now: at("2026-10-22T11:30:00Z") }),
    ).toBe("dinner");
    expect(guessMeal([], { isToday: false })).toBe("lunch");
  });
});

describe("parseSqliteUtc", () => {
  it("reads SQLite datetime('now') values as UTC", () => {
    expect(parseSqliteUtc("2026-10-22 11:00:00")).toBe(
      Date.UTC(2026, 9, 22, 11, 0, 0),
    );
  });
});
