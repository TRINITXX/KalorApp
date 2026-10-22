import type { WeekSummaryRow } from "@/db/queries/entries";

export interface Trend {
  /** Calories per logged day, across every week shown. */
  dailyAverage: number;
  /** Change of the last finished week against the finished weeks before it. */
  pct: number;
  direction: "up" | "down" | "neutral";
}

const perDay = (w: WeekSummaryRow) => w.total_calories / w.days_logged;

/**
 * Compares days, not week totals: a week with 3 logged days is not a diet
 * success. The current week is left out of the comparison until it ends.
 */
export function computeTrend(
  weeks: WeekSummaryRow[],
  currentWeekStart: string,
): Trend {
  const logged = weeks.filter((w) => w.days_logged > 0);
  const totalDays = logged.reduce((s, w) => s + w.days_logged, 0);
  const dailyAverage =
    totalDays > 0
      ? logged.reduce((s, w) => s + w.total_calories, 0) / totalDays
      : 0;

  const finished = logged.filter((w) => w.week_start < currentWeekStart);
  if (finished.length < 2) return { dailyAverage, pct: 0, direction: "neutral" };

  const last = perDay(finished[finished.length - 1]);
  const before = finished.slice(0, -1);
  const reference = before.reduce((s, w) => s + perDay(w), 0) / before.length;
  const pct = Math.round(((last - reference) / reference) * 100);

  return {
    dailyAverage,
    pct: Math.abs(pct),
    direction: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  };
}
