import { useState, useCallback, useMemo, useRef } from "react";

import { useDb } from "@/app/_layout";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
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
  // Only the latest requested day may write its result: switching days fast
  // must not let a slower, older query overwrite the screen.
  const latestDate = useRef(date);
  latestDate.current = date;

  const refresh = useCallback(async () => {
    const e = await getEntriesByDate(db, date);
    if (latestDate.current !== date) return;
    setEntries(e);
    setLoading(false);
  }, [db, date]);

  useRefreshOnFocus(
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
