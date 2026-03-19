import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";

import { getWeeklyTotals, getWeeklySummaries } from "@/db/queries/entries";

interface DailyTotal {
  date: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export function useWeeklyStats(startDate: string, endDate: string) {
  const db = useSQLiteContext();
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);

  const refresh = useCallback(async () => {
    const totals = await getWeeklyTotals(db, startDate, endDate);
    setDailyTotals(totals);
  }, [db, startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dailyTotals, refresh };
}

interface WeeklySummary {
  week_start: string;
  total_calories: number;
}

export function useWeekComparisons(weeks: number) {
  const db = useSQLiteContext();
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);

  useEffect(() => {
    getWeeklySummaries(db, weeks).then(setSummaries);
  }, [db, weeks]);

  return summaries;
}
