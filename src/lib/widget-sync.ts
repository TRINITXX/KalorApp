import type { SQLiteDatabase } from "expo-sqlite";

import { getDailySummary } from "@/db/queries/entries";
import { formatDateISO } from "@/lib/product-utils";
import { useSettingsStore } from "@/stores/settings-store";
import { setWidgetData, reloadWidgets } from "@/modules/widget-bridge";

export async function syncWidgetData(db: SQLiteDatabase): Promise<void> {
  const date = formatDateISO();
  const summary = await getDailySummary(db, date);
  const goals = useSettingsStore.getState().goals;

  const payload = JSON.stringify({
    date,
    calories: summary.calories,
    proteins: summary.proteins,
    carbs: summary.carbs,
    fats: summary.fats,
    fiber: summary.fiber,
    sugars: summary.sugars,
    saturated_fat: summary.saturated_fat,
    salt: summary.salt,
    caloriesGoal: goals.calories,
    proteinsGoal: goals.proteins,
    carbsGoal: goals.carbs,
    fatsGoal: goals.fats,
    fiberGoal: goals.fiber,
    sugarsGoal: goals.sugars,
    saturatedFatGoal: goals.saturated_fat,
    saltGoal: goals.salt,
  });

  setWidgetData(payload);
  reloadWidgets();
}
