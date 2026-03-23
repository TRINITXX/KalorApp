import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { useDb } from "@/app/_layout";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { MacroRing } from "@/components/nutrition/macro-ring";
import { MicroChips } from "@/components/nutrition/micro-chips";
import { MealSection } from "@/components/nutrition/meal-section";
import { MEALS } from "@/constants/meals";
import { SPACING } from "@/constants/theme";
import { deleteEntry } from "@/db/queries/entries";
import { useDailySummary } from "@/hooks/use-daily-summary";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useSettingsStore } from "@/stores/settings-store";
import { formatDateISO } from "@/lib/product-utils";
import type { EntryRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

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
  const db = useDb();
  const goals = useSettingsStore((s) => s.goals);
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);

  const todayDate = useMemo(() => formatDateISO(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);
  const { entries, summary, loading, refresh } = useDailySummary(todayDate);

  const entriesByMeal = useMemo(() => {
    const grouped: Record<MealType, typeof entries> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
    };
    for (const e of entries) {
      grouped[e.meal].push(e);
    }
    return grouped;
  }, [entries]);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteEntry(db, id);
      await refresh();
    },
    [db, refresh],
  );

  const handleEdit = useCallback((entry: EntryRow) => {
    router.push(
      `/add-entry/confirm?productId=${entry.product_id}&entryId=${entry.id}&entryQuantity=${entry.quantity}`,
    );
  }, []);

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
          {formattedDate}
        </Text>

        {/* Calorie ring */}
        <View style={{ alignItems: "center" }}>
          <CalorieRing
            consumed={Math.round(summary.calories)}
            goal={goals.calories ?? 2100}
          />
        </View>

        {/* Macro rings */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            alignItems: "flex-start",
          }}
        >
          <MacroRing
            label="Protéines"
            current={summary.proteins}
            goal={goals.proteins}
            color={colors.accent.proteins}
          />
          <MacroRing
            label="Glucides"
            current={summary.carbs}
            goal={goals.carbs}
            color={colors.accent.carbs}
          />
          <MacroRing
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
            entries={entriesByMeal[meal.type]}
            onDelete={handleDelete}
            onEdit={handleEdit}
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
