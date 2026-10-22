import { useState, useCallback } from "react";

import { useDb } from "@/app/_layout";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import {
  getWeeklyTotals,
  getWeeklySummaries,
  type WeekSummaryRow,
} from "@/db/queries/entries";

interface DailyTotal {
  date: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

// Both hooks reload on focus and on return to the foreground: the history tab
// stays mounted, and food added elsewhere (day screen, Siri) must show up.

export function useWeeklyStats(startDate: string, endDate: string) {
  const db = useDb();
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);

  useRefreshOnFocus(
    useCallback(() => {
      let active = true;
      getWeeklyTotals(db, startDate, endDate).then((totals) => {
        if (active) setDailyTotals(totals);
      });
      return () => {
        active = false;
      };
    }, [db, startDate, endDate]),
  );

  return dailyTotals;
}

export function useWeekSummaries(startDate: string) {
  const db = useDb();
  const [summaries, setSummaries] = useState<WeekSummaryRow[]>([]);

  useRefreshOnFocus(
    useCallback(() => {
      let active = true;
      getWeeklySummaries(db, startDate).then((rows) => {
        if (active) setSummaries(rows);
      });
      return () => {
        active = false;
      };
    }, [db, startDate]),
  );

  return summaries;
}
