import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { SPACING } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useWeeklyStats, useWeekComparisons } from "@/hooks/use-weekly-stats";
import { useSettingsStore } from "@/stores/settings-store";
import { formatDateISO } from "@/lib/product-utils";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { MacroRing } from "@/components/nutrition/macro-ring";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const SHORT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "avr",
  "mai",
  "juin",
  "juil",
  "aou",
  "sep",
  "oct",
  "nov",
  "dec",
];

function getMonday(offset: number): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // distance to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

function formatWeekLabel(monday: Date, sunday: Date): string {
  const mDay = monday.getDate();
  const sDay = sunday.getDate();
  const mMonth = SHORT_MONTHS[monday.getMonth()];
  const sMonth = SHORT_MONTHS[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `Lun ${mDay} - Dim ${sDay} ${mMonth}`;
  }
  return `Lun ${mDay} ${mMonth} - Dim ${sDay} ${sMonth}`;
}

function getDayOfWeekIndex(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Mon=0 .. Sun=6
}

// ---------------------------------------------------------------------------
// Custom Segmented Control
// ---------------------------------------------------------------------------

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  colors: ReturnType<typeof useThemeColors>;
}

function SegmentedControl({
  values,
  selectedIndex,
  onChange,
  colors,
}: SegmentedControlProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 10,
        padding: 3,
      }}
    >
      {values.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <Pressable
            key={label}
            onPress={() => onChange(i)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: active ? colors.card : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "600" : "400",
                color: active ? colors.textPrimary : colors.textMuted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Simple Bar (View-based, no Skia dependency for reliability)
// ---------------------------------------------------------------------------

interface SimpleBarChartProps {
  data: { label: string; value: number }[];
  maxValue: number;
  goalValue?: number;
  barColor: string;
  goalColor?: string;
  colors: ReturnType<typeof useThemeColors>;
  height?: number;
}

function SimpleBarChart({
  data,
  maxValue,
  goalValue,
  barColor,
  goalColor,
  colors,
  height = 180,
}: SimpleBarChartProps) {
  const chartMax = Math.max(maxValue, goalValue ?? 0, 1);

  return (
    <View style={{ height, paddingHorizontal: 4 }}>
      {/* Goal line */}
      {goalValue != null && goalValue > 0 && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: (goalValue / chartMax) * (height - 24) + 24,
            height: 1,
            backgroundColor: goalColor ?? colors.textMuted,
            opacity: 0.6,
            zIndex: 2,
          }}
        />
      )}

      {/* Bars */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 6,
          paddingBottom: 24,
        }}
      >
        {data.map((item, i) => {
          const barHeight = Math.max(
            (item.value / chartMax) * (height - 24),
            item.value > 0 ? 4 : 0,
          );
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: "70%",
                  height: barHeight,
                  backgroundColor: barColor,
                  borderRadius: 4,
                  opacity: item.value > 0 ? 1 : 0.15,
                  minHeight: 2,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Labels */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: 4,
        }}
      >
        {data.map((item, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                fontVariant: ["tabular-nums"],
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Week View
// ---------------------------------------------------------------------------

function WeekView() {
  const colors = useThemeColors();
  const goals = useSettingsStore((s) => s.goals);
  const goalCalories = goals.calories ?? 2100;
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = useMemo(() => getMonday(weekOffset), [weekOffset]);
  const sunday = useMemo(() => getSunday(monday), [monday]);
  const startDate = formatDateISO(monday);
  const endDate = formatDateISO(sunday);
  const weekLabel = formatWeekLabel(monday, sunday);

  const { dailyTotals } = useWeeklyStats(startDate, endDate);

  // Build 7-day array (Mon-Sun), fill in data from query
  const weekData = useMemo(() => {
    const result = DAY_LABELS.map((label) => ({
      label,
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
    }));

    for (const t of dailyTotals) {
      const idx = getDayOfWeekIndex(t.date);
      if (idx >= 0 && idx < 7) {
        result[idx] = {
          label: DAY_LABELS[idx],
          calories: Math.round(t.calories),
          proteins: Math.round(t.proteins),
          carbs: Math.round(t.carbs),
          fats: Math.round(t.fats),
        };
      }
    }
    return result;
  }, [dailyTotals]);

  const weekTotals = useMemo(() => {
    return weekData.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        proteins: acc.proteins + d.proteins,
        carbs: acc.carbs + d.carbs,
        fats: acc.fats + d.fats,
      }),
      { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    );
  }, [weekData]);

  const maxCal = useMemo(
    () => Math.max(...weekData.map((d) => d.calories), goalCalories),
    [weekData, goalCalories],
  );

  const isCurrentWeek = weekOffset === 0;

  return (
    <View style={{ gap: SPACING.lg }}>
      {/* Week navigator */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => setWeekOffset((o) => o - 1)}
          hitSlop={12}
          style={{ padding: SPACING.sm }}
        >
          <Text style={{ fontSize: 20, color: colors.accent.calories }}>
            {"<"}
          </Text>
        </Pressable>

        <Pressable onPress={() => setWeekOffset(0)} disabled={isCurrentWeek}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
            {weekLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setWeekOffset((o) => o + 1)}
          hitSlop={12}
          disabled={isCurrentWeek}
          style={{ padding: SPACING.sm, opacity: isCurrentWeek ? 0.3 : 1 }}
        >
          <Text style={{ fontSize: 20, color: colors.accent.calories }}>
            {">"}
          </Text>
        </Pressable>
      </View>

      {/* Weekly totals — rings */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: SPACING.lg,
          gap: SPACING.md,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: colors.textMuted,
            textAlign: "center",
          }}
        >
          Total semaine
        </Text>
        <View style={{ alignItems: "center" }}>
          <CalorieRing
            consumed={weekTotals.calories}
            goal={goalCalories * 7}
            size={130}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
          }}
        >
          <MacroRing
            label="Proteines"
            current={weekTotals.proteins}
            goal={goals.proteins != null ? goals.proteins * 7 : null}
            color={colors.accent.proteins}
            size={80}
          />
          <MacroRing
            label="Glucides"
            current={weekTotals.carbs}
            goal={goals.carbs != null ? goals.carbs * 7 : null}
            color={colors.accent.carbs}
            size={80}
          />
          <MacroRing
            label="Lipides"
            current={weekTotals.fats}
            goal={goals.fats != null ? goals.fats * 7 : null}
            color={colors.accent.fats}
            size={80}
          />
        </View>
      </View>

      {/* Bar chart */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: SPACING.lg,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: colors.textMuted,
            marginBottom: SPACING.md,
          }}
        >
          Calories par jour
        </Text>

        <SimpleBarChart
          data={weekData.map((d) => ({ label: d.label, value: d.calories }))}
          maxValue={maxCal}
          goalValue={goalCalories}
          barColor={colors.accent.calories}
          goalColor={colors.accent.calories}
          colors={colors}
        />

        {/* Legend */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: SPACING.md,
            marginTop: SPACING.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: colors.accent.calories,
              }}
            />
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Calories
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 14,
                height: 1,
                backgroundColor: colors.accent.calories,
                opacity: 0.6,
              }}
            />
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Objectif ({goalCalories})
            </Text>
          </View>
        </View>
      </View>

      {/* Day-by-day detail */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: SPACING.lg,
          gap: SPACING.sm,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: colors.textMuted,
            marginBottom: 4,
          }}
        >
          Detail par jour
        </Text>

        {weekData.map((day, i) => {
          const pct =
            goalCalories > 0
              ? Math.round((day.calories / goalCalories) * 100)
              : 0;
          const isOver = day.calories > goalCalories;
          return (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 6,
                borderBottomWidth: i < 6 ? 1 : 0,
                borderBottomColor: colors.separator,
              }}
            >
              <Text
                style={{
                  width: 36,
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.textSecondary,
                }}
              >
                {day.label}
              </Text>

              {/* Mini progress bar */}
              <View
                style={{
                  flex: 1,
                  height: 6,
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: 3,
                  marginHorizontal: SPACING.md,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: "100%",
                    backgroundColor: isOver
                      ? colors.accent.fats
                      : colors.accent.calories,
                    borderRadius: 3,
                  }}
                />
              </View>

              <Text
                selectable
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  fontVariant: ["tabular-nums"],
                  color:
                    day.calories > 0 ? colors.textPrimary : colors.textMuted,
                  width: 70,
                  textAlign: "right",
                }}
              >
                {day.calories} kcal
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stat item helper
// ---------------------------------------------------------------------------

interface StatItemProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  textColor: string;
  mutedColor: string;
}

function StatItem({
  label,
  value,
  unit,
  color,
  textColor,
  mutedColor,
}: StatItemProps) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text
        selectable
        style={{
          fontSize: 18,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
          color,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: mutedColor }}>{unit}</Text>
      <Text style={{ fontSize: 11, fontWeight: "500", color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Trends View
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { label: "4 sem", weeks: 4 },
  { label: "8 sem", weeks: 8 },
  { label: "12 sem", weeks: 12 },
] as const;

function TrendsView() {
  const colors = useThemeColors();
  const [periodIndex, setPeriodIndex] = useState(0);
  const weeks = PERIOD_OPTIONS[periodIndex].weeks;
  const summaries = useWeekComparisons(weeks);

  // Sort chronologically (oldest first) for chart display
  const sortedSummaries = useMemo(
    () =>
      [...summaries].sort((a, b) => a.week_start.localeCompare(b.week_start)),
    [summaries],
  );

  const maxCal = useMemo(
    () => Math.max(...sortedSummaries.map((s) => s.total_calories), 1),
    [sortedSummaries],
  );

  const weeklyAvg = useMemo(() => {
    if (sortedSummaries.length === 0) return 0;
    const total = sortedSummaries.reduce((s, w) => s + w.total_calories, 0);
    return Math.round(total / sortedSummaries.length);
  }, [sortedSummaries]);

  // Trend: last week vs average of all other weeks
  const trend = useMemo(() => {
    if (sortedSummaries.length < 2)
      return { pct: 0, direction: "neutral" as const };
    const lastWeek = sortedSummaries[sortedSummaries.length - 1];
    const prevWeeks = sortedSummaries.slice(0, -1);
    const prevAvg =
      prevWeeks.reduce((s, w) => s + w.total_calories, 0) / prevWeeks.length;
    if (prevAvg === 0) return { pct: 0, direction: "neutral" as const };
    const pct = Math.round(
      ((lastWeek.total_calories - prevAvg) / prevAvg) * 100,
    );
    return {
      pct: Math.abs(pct),
      direction:
        pct > 0
          ? ("up" as const)
          : pct < 0
            ? ("down" as const)
            : ("neutral" as const),
    };
  }, [sortedSummaries]);

  const formatWeekShort = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <View style={{ gap: SPACING.lg }}>
      {/* Period selector */}
      <View
        style={{
          flexDirection: "row",
          gap: SPACING.sm,
          justifyContent: "center",
        }}
      >
        {PERIOD_OPTIONS.map((opt, i) => {
          const active = i === periodIndex;
          return (
            <Pressable
              key={opt.label}
              onPress={() => setPeriodIndex(i)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: active
                  ? colors.accent.calories
                  : colors.backgroundSecondary,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "600" : "400",
                  color: active ? "#ffffff" : colors.textMuted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Summary cards */}
      <View style={{ flexDirection: "row", gap: SPACING.md }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: SPACING.lg,
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            Moy. hebdo
          </Text>
          <Text
            selectable
            style={{
              fontSize: 22,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
              color: colors.accent.calories,
            }}
          >
            {weeklyAvg}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>kcal</Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: SPACING.lg,
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            Tendance
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text
              style={{
                fontSize: 16,
                color:
                  trend.direction === "up"
                    ? colors.accent.fats
                    : trend.direction === "down"
                      ? colors.accent.calories
                      : colors.textMuted,
              }}
            >
              {trend.direction === "up"
                ? "\u2191"
                : trend.direction === "down"
                  ? "\u2193"
                  : "-"}
            </Text>
            <Text
              selectable
              style={{
                fontSize: 22,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
                color:
                  trend.direction === "up"
                    ? colors.accent.fats
                    : trend.direction === "down"
                      ? colors.accent.calories
                      : colors.textMuted,
              }}
            >
              {trend.pct}%
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            vs moy. precedente
          </Text>
        </View>
      </View>

      {/* Bar chart */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: SPACING.lg,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: colors.textMuted,
            marginBottom: SPACING.md,
          }}
        >
          Calories par semaine
        </Text>

        {sortedSummaries.length === 0 ? (
          <View
            style={{
              height: 180,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textMuted }}>
              Pas encore de donnees
            </Text>
          </View>
        ) : (
          <SimpleBarChart
            data={sortedSummaries.map((s) => ({
              label: formatWeekShort(s.week_start),
              value: s.total_calories,
            }))}
            maxValue={maxCal}
            barColor={colors.accent.calories}
            colors={colors}
            height={200}
          />
        )}
      </View>

      {/* Week detail list */}
      {sortedSummaries.length > 0 && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: SPACING.lg,
            gap: SPACING.sm,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: colors.textMuted,
              marginBottom: 4,
            }}
          >
            Detail par semaine
          </Text>
          {sortedSummaries.map((s, i) => (
            <View
              key={s.week_start}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 6,
                borderBottomWidth: i < sortedSummaries.length - 1 ? 1 : 0,
                borderBottomColor: colors.separator,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontVariant: ["tabular-nums"],
                }}
              >
                Sem. {formatWeekShort(s.week_start)}
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  fontVariant: ["tabular-nums"],
                  color: colors.textPrimary,
                }}
              >
                {Math.round(s.total_calories)} kcal
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const colors = useThemeColors();
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: SPACING.lg,
          paddingBottom: 100,
          gap: SPACING.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented control */}
        <SegmentedControl
          values={["Semaine", "Tendances"]}
          selectedIndex={tabIndex}
          onChange={setTabIndex}
          colors={colors}
        />

        {tabIndex === 0 ? <WeekView /> : <TrendsView />}
      </ScrollView>
    </View>
  );
}
