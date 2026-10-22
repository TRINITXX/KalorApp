import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { useDb } from "@/app/_layout";
import { DaySummaryCard } from "@/components/nutrition/day-summary-card";
import { MealCard } from "@/components/nutrition/meal-card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { PrimaryButton } from "@/components/ui/primary-button";
import { UndoToast } from "@/components/ui/undo-toast";
import { MEALS } from "@/constants/meals";
import { deleteEntry, restoreEntry } from "@/db/queries/entries";
import { useDailySummary } from "@/hooks/use-daily-summary";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useSingleNavigation } from "@/hooks/use-single-navigation";
import { useToday } from "@/hooks/use-today";
import { addDays, formatDaySubtitle, formatDayTitle } from "@/lib/dates";
import { useSettingsStore } from "@/stores/settings-store";
import type { EntryRow } from "@/types/database";
import type { Goals, MealType } from "@/types/nutrition";
import { formatAmount } from "@/lib/nutrition-utils";

const UNDO_DELAY_MS = 4000;

export default function DayScreen() {
  const colors = useThemeColors();
  const db = useDb();
  const insets = useSafeAreaInsets();
  const goals = useSettingsStore((s) => s.goals);
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);

  const today = useToday();
  // null follows today, so the screen rolls over at midnight by itself.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const isToday = date === today;

  const { entries, summary, loading, refresh } = useDailySummary(date);

  const [deleted, setDeleted] = useState<EntryRow | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const goToDay = useCallback(
    (iso: string) => setPickedDate(iso >= today ? null : iso),
    [today],
  );

  // The history tab opens a day here with ?date=YYYY-MM-DD.
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  useEffect(() => {
    if (!dateParam) return;
    goToDay(dateParam);
    router.setParams({ date: undefined });
  }, [dateParam, goToDay]);

  const entriesByMeal = useMemo(() => {
    const grouped: Record<MealType, EntryRow[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
    };
    for (const e of entries) grouped[e.meal].push(e);
    return grouped;
  }, [entries]);

  // A disabled meal still shows when it holds food, so the total always adds up.
  const visibleMeals = MEALS.filter(
    (m) => enabledMeals[m.type] || entriesByMeal[m.type].length > 0,
  );

  const navigate = useSingleNavigation();

  const openAdd = useCallback(
    (meal?: MealType) => {
      // No date for today: the add screen then follows the clock past midnight.
      const params: { date?: string; meal?: MealType } = {};
      if (!isToday) params.date = date;
      if (meal) params.meal = meal;
      navigate(() => router.push({ pathname: "/add-entry", params }));
    },
    [date, isToday, navigate],
  );

  const handleEdit = useCallback(
    (entry: EntryRow) =>
      navigate(() =>
        router.push(
          `/add-entry/confirm?productId=${encodeURIComponent(entry.product_id)}&entryId=${entry.id}`,
        ),
      ),
    [navigate],
  );

  const handleDelete = useCallback(
    async (entry: EntryRow) => {
      await deleteEntry(db, entry.id);
      await refresh();
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setDeleted(entry);
      undoTimer.current = setTimeout(() => setDeleted(null), UNDO_DELAY_MS);
    },
    [db, refresh],
  );

  const handleUndo = useCallback(async () => {
    if (!deleted) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setDeleted(null);
    await restoreEntry(db, deleted);
    await refresh();
  }, [db, deleted, refresh]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 110,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <DayNavigator
          title={formatDayTitle(date, today)}
          subtitle={isToday || date === addDays(today, -1) ? formatDaySubtitle(date) : null}
          canGoForward={!isToday}
          onPrevious={() => goToDay(addDays(date, -1))}
          onNext={() => goToDay(addDays(date, 1))}
          onToday={isToday ? undefined : () => setPickedDate(null)}
        />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={colors.textMuted} />
        ) : (
          <>
            <DaySummaryCard
              calories={summary.calories}
              calorieGoal={goals.calories ?? 2100}
              proteins={summary.proteins}
              carbs={summary.carbs}
              fats={summary.fats}
              goals={{ proteins: goals.proteins, carbs: goals.carbs, fats: goals.fats }}
            />
            <MicroLine summary={summary} goals={goals} />
            {visibleMeals.map((meal) => (
              <MealCard
                key={meal.type}
                meal={meal.type}
                entries={entriesByMeal[meal.type]}
                onAdd={openAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 16, right: 16, bottom: 12, gap: 10 }}
      >
        {deleted && (
          <UndoToast message={`${deleted.product_name} supprimé`} onUndo={handleUndo} />
        )}
        <PrimaryButton
          label={isToday ? "Ajouter" : `Ajouter à ${formatDayTitle(date, today).toLowerCase()}`}
          onPress={() => openAdd()}
          style={{ boxShadow: "0px 6px 18px rgba(0,0,0,0.25)" }}
        />
      </View>
    </View>
  );
}

const MICROS = [
  { key: "fiber", label: "Fibres" },
  { key: "sugars", label: "Sucres" },
  { key: "saturated_fat", label: "Graisses saturées" },
  { key: "salt", label: "Sel" },
] as const;

/** Fibre, sugar, saturated fat and salt, only those with a goal in settings. */
function MicroLine({
  summary,
  goals,
}: {
  summary: Record<(typeof MICROS)[number]["key"], number>;
  goals: Goals;
}) {
  const colors = useThemeColors();
  const shown = MICROS.filter((m) => goals[m.key] != null);
  if (shown.length === 0) return null;
  return (
    <Text style={{ fontSize: 13, color: colors.textSecondary, marginHorizontal: 4 }}>
      {shown
        .map((m) => {
          const value = summary[m.key];
          const over = value > (goals[m.key] ?? Infinity);
          return `${m.label} ${formatAmount(value)}/${formatAmount(goals[m.key] ?? 0)} g${over ? " ⚠︎" : ""}`;
        })
        .join("  ·  ")}
    </Text>
  );
}

interface DayNavigatorProps {
  title: string;
  subtitle: string | null;
  canGoForward: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday?: () => void;
}

function DayNavigator({
  title,
  subtitle,
  canGoForward,
  onPrevious,
  onNext,
  onToday,
}: DayNavigatorProps) {
  const colors = useThemeColors();
  const arrow = {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <PressableScale
        onPress={onPrevious}
        hitSlop={8}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel="Jour précédent"
        style={arrow}
      >
        <SymbolView name="chevron.left" size={15} weight="semibold" tintColor={colors.accent.caloriesText} />
      </PressableScale>

      <PressableScale
        onPress={onToday}
        scaleTo={onToday ? 0.97 : 1}
        accessibilityRole={onToday ? "button" : "header"}
        accessibilityHint={onToday ? "Revenir à aujourd'hui" : undefined}
        style={{ flex: 1, alignItems: "center" }}
      >
        <Text
          numberOfLines={1}
          style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: colors.textPrimary }}
        >
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>{subtitle}</Text>
        ) : onToday ? (
          <Text style={{ fontSize: 13, color: colors.accent.caloriesText, marginTop: 1, fontWeight: "600" }}>
            Revenir à aujourd'hui
          </Text>
        ) : null}
      </PressableScale>

      <PressableScale
        onPress={onNext}
        disabled={!canGoForward}
        hitSlop={8}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel="Jour suivant"
        style={arrow}
      >
        <SymbolView name="chevron.right" size={15} weight="semibold" tintColor={colors.accent.caloriesText} />
      </PressableScale>
    </View>
  );
}
