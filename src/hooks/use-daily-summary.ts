import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";

import { getEntriesByDate, getDailySummary } from "@/db/queries/entries";
import type { EntryRow } from "@/types/database";
import type { DailySummaryRow } from "@/db/queries/entries";

export function useDailySummary(date: string) {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [summary, setSummary] = useState<DailySummaryRow>({
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    sugars: 0,
    saturated_fat: 0,
    salt: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [e, s] = await Promise.all([
      getEntriesByDate(db, date),
      getDailySummary(db, date),
    ]);
    setEntries(e);
    setSummary(s);
    setLoading(false);
  }, [db, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, summary, loading, refresh };
}
