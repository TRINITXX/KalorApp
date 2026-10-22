import { computeTrend } from "@/lib/trends";

const week = (week_start: string, total_calories: number, days_logged: number) => ({
  week_start,
  total_calories,
  days_logged,
});

describe("computeTrend", () => {
  it("leaves the unfinished current week out of the comparison", () => {
    const trend = computeTrend(
      [
        week("2026-10-05", 14000, 7),
        week("2026-10-12", 14000, 7),
        week("2026-10-19", 2000, 1), // Monday of the current week
      ],
      "2026-10-19",
    );
    expect(trend).toMatchObject({ pct: 0, direction: "neutral" });
  });

  it("compares calories per logged day, not week totals", () => {
    // 3 logged days at 2 000 kcal is the same diet as 7 days at 2 000 kcal.
    const trend = computeTrend(
      [week("2026-10-05", 14000, 7), week("2026-10-12", 6000, 3)],
      "2026-10-19",
    );
    expect(trend.direction).toBe("neutral");
  });

  it("reports a drop against the previous finished weeks", () => {
    const trend = computeTrend(
      [
        week("2026-09-28", 17500, 7),
        week("2026-10-05", 17500, 7),
        week("2026-10-12", 14000, 7),
      ],
      "2026-10-19",
    );
    expect(trend).toMatchObject({ pct: 20, direction: "down" });
  });

  it("averages calories over logged days only", () => {
    const trend = computeTrend(
      [week("2026-10-12", 6000, 3), week("2026-10-19", 2000, 1)],
      "2026-10-19",
    );
    expect(trend.dailyAverage).toBe(2000);
  });
});
