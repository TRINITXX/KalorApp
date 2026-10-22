import type { MealType } from "@/types/nutrition";

const LUNCH_FOLLOW_UP_MS = 2 * 60 * 60 * 1000;

export interface MealRuleEntry {
  meal: MealType;
  /** SQLite `datetime('now')` value: UTC, "YYYY-MM-DD HH:MM:SS". */
  created_at: string;
}

export function parseSqliteUtc(value: string): number {
  return Date.parse(`${value.replace(" ", "T")}Z`);
}

/**
 * Picks the meal a new entry belongs to. The user eats two meals a day:
 * the first food logged is lunch, everything after is dinner, except food
 * added less than 2 hours after the last lunch item (a forgotten dessert).
 * Snack is never guessed, only chosen by hand.
 */
export function guessMeal(
  dayEntries: MealRuleEntry[],
  options: { isToday: boolean; now?: Date },
): MealType {
  const lunch = dayEntries.filter((e) => e.meal === "lunch");
  const hasDinner = dayEntries.some((e) => e.meal === "dinner");

  if (hasDinner) return "dinner";
  if (lunch.length === 0) return "lunch";
  if (!options.isToday) return "dinner";

  const now = (options.now ?? new Date()).getTime();
  const lastLunch = Math.max(...lunch.map((e) => parseSqliteUtc(e.created_at)));
  return now - lastLunch < LUNCH_FOLLOW_UP_MS ? "lunch" : "dinner";
}
