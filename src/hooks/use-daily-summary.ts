import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";

import { useDb } from "@/app/_layout";
import { getEntriesByDate } from "@/db/queries/entries";
import type { EntryRow } from "@/types/database";
import type { DailySummaryRow } from "@/db/queries/entries";

const EMPTY_SUMMARY: DailySummaryRow = {
  calories: 0,
  proteins: 0,
  carbs: 0,
  fats: 0,
  fiber: 0,
  sugars: 0,
  saturated_fat: 0,
  salt: 0,
};

export function useDailySummary(date: string) {
  const db = useDb();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const e = await getEntriesByDate(db, date);
    setEntries(e);
    setLoading(false);
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const summary = useMemo<DailySummaryRow>(() => {
    if (entries.length === 0) return EMPTY_SUMMARY;
    return entries.reduce<DailySummaryRow>(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        proteins: acc.proteins + e.proteins,
        carbs: acc.carbs + e.carbs,
        fats: acc.fats + e.fats,
        fiber: acc.fiber + (e.fiber ?? 0),
        sugars: acc.sugars + (e.sugars ?? 0),
        saturated_fat: acc.saturated_fat + (e.saturated_fat ?? 0),
        salt: acc.salt + (e.salt ?? 0),
      }),
      { ...EMPTY_SUMMARY },
    );
  }, [entries]);

  return { entries, summary, loading, refresh };
}
