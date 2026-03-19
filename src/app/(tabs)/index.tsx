import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { router } from "expo-router";

import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { MacroBar } from "@/components/nutrition/macro-bar";
import { MicroChips } from "@/components/nutrition/micro-chips";
import { MealSection } from "@/components/nutrition/meal-section";
import { MEALS } from "@/constants/meals";
import { SPACING } from "@/constants/theme";
import { deleteEntry } from "@/db/queries/entries";
import { useDailySummary } from "@/hooks/use-daily-summary";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useSettingsStore } from "@/stores/settings-store";
import type { MealType } from "@/types/nutrition";

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getFormattedDate(): string {
  const formatted = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const goals = useSettingsStore((s) => s.goals);
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);

  const todayDate = getTodayDate();
  const { entries, summary, loading, refresh } = useDailySummary(todayDate);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteEntry(db, id);
      await refresh();
    },
    [db, refresh],
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: SPACING.lg,
          paddingBottom: 100,
          gap: SPACING.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date header */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.textPrimary,
            textAlign: "center",
          }}
        >
          {getFormattedDate()}
        </Text>

        {/* Calorie ring */}
        <View style={{ alignItems: "center" }}>
          <CalorieRing
            consumed={Math.round(summary.calories)}
            goal={goals.calories ?? 2100}
          />
        </View>

        {/* Macro bars */}
        <View style={{ gap: SPACING.md }}>
          <MacroBar
            label="Proteines"
            current={summary.proteins}
            goal={goals.proteins}
            color={colors.accent.proteins}
          />
          <MacroBar
            label="Glucides"
            current={summary.carbs}
            goal={goals.carbs}
            color={colors.accent.carbs}
          />
          <MacroBar
            label="Lipides"
            current={summary.fats}
            goal={goals.fats}
            color={colors.accent.fats}
          />
        </View>

        {/* Micro chips */}
        <MicroChips
          fiber={summary.fiber}
          sugars={summary.sugars}
          saturatedFat={summary.saturated_fat}
          salt={summary.salt}
        />

        {/* Meal sections */}
        {MEALS.filter((m) => enabledMeals[m.type]).map((meal) => (
          <MealSection
            key={meal.type}
            meal={meal.type}
            entries={entries.filter(
              (e) => e.meal === (meal.type as MealType as string),
            )}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/add-entry")}
        style={{
          position: "absolute",
          bottom: SPACING.xxl,
          right: SPACING.xxl,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accent.calories,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "600",
            color: "#ffffff",
            lineHeight: 30,
          }}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}
