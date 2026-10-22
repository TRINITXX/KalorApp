import {
  addDays,
  formatDateISO,
  formatDayTitle,
  mondayOf,
  msUntilMidnight,
} from "@/lib/dates";

describe("dates", () => {
  it("formats the local calendar date, not the UTC one", () => {
    // 23:30 local time stays on the same local day whatever the UTC offset.
    expect(formatDateISO(new Date(2026, 9, 22, 23, 30))).toBe("2026-10-22");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the Monday of the week", () => {
    expect(mondayOf("2026-10-22")).toBe("2026-10-19");
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
    expect(mondayOf("2026-10-19")).toBe("2026-10-19");
  });

  it("names today and yesterday", () => {
    expect(formatDayTitle("2026-10-22", "2026-10-22")).toBe("Aujourd'hui");
    expect(formatDayTitle("2026-10-21", "2026-10-22")).toBe("Hier");
  });

  it("counts the time left before midnight", () => {
    expect(msUntilMidnight(new Date(2026, 9, 22, 23, 59, 0))).toBe(60_000);
  });
});
