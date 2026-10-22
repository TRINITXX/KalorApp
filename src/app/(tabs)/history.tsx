import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";

import { BarChart } from "@/components/nutrition/bar-chart";
import { Card } from "@/components/ui/card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useToday } from "@/hooks/use-today";
import { useWeekSummaries, useWeeklyStats } from "@/hooks/use-weekly-stats";
import { addDays, mondayOf, parseDateISO } from "@/lib/dates";
import { formatNumber } from "@/lib/nutrition-utils";
import { computeTrend } from "@/lib/trends";
import { useSettingsStore } from "@/stores/settings-store";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function shortDate(iso: string): string {
  return parseDateISO(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7);
  const start = sameMonth ? String(parseDateISO(monday).getDate()) : shortDate(monday);
  return `${start} – ${shortDate(sunday)}`;
}

function openDay(date: string) {
  router.navigate({ pathname: "/", params: { date } });
}

export default function HistoryScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<"week" | "trends">("week");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <SegmentedControl
        options={[
          { value: "week", label: "Semaine" },
          { value: "trends", label: "Tendances" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "week" ? <WeekView /> : <TrendsView />}
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 16, marginTop: 4, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}

function BigStat({ value, unit, caption }: { value: string; unit: string; caption: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{caption}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontSize: 28,
          fontWeight: "800",
          letterSpacing: -0.5,
          color: colors.textPrimary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
        <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textSecondary }}> {unit}</Text>
      </Text>
    </View>
  );
}

function WeekView() {
  const colors = useThemeColors();
  const goals = useSettingsStore((s) => s.goals);
  const goal = goals.calories ?? 2100;
  const today = useToday();
  const [offset, setOffset] = useState(0);

  const monday = addDays(mondayOf(today), offset * 7);
  const sunday = addDays(monday, 6);
  const totals = useWeeklyStats(monday, sunday);

  const days = useMemo(
    () =>
      DAY_LABELS.map((label, i) => {
        const date = addDays(monday, i);
        const t = totals.find((x) => x.date === date);
        return {
          label,
          date,
          calories: t?.calories ?? 0,
          proteins: t?.proteins ?? 0,
          carbs: t?.carbs ?? 0,
          fats: t?.fats ?? 0,
          future: date > today,
        };
      }),
    [monday, totals, today],
  );

  const logged = days.filter((d) => d.calories > 0);
  const avg = (key: "calories" | "proteins" | "carbs" | "fats") =>
    logged.length > 0 ? logged.reduce((s, d) => s + d[key], 0) / logged.length : 0;

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <ChevronButton direction="left" label="Semaine précédente" onPress={() => setOffset((o) => o - 1)} />
        <Pressable onPress={() => setOffset(0)} disabled={offset === 0}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.textPrimary }}>
            {offset === 0 ? "Cette semaine" : weekLabel(monday)}
          </Text>
        </Pressable>
        <ChevronButton
          direction="right"
          label="Semaine suivante"
          disabled={offset === 0}
          onPress={() => setOffset((o) => Math.min(o + 1, 0))}
        />
      </View>

      <Card style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <BigStat
            caption="Moyenne par jour noté"
            value={logged.length > 0 ? formatNumber(avg("calories")) : "–"}
            unit="kcal"
          />
          <BigStat caption="Jours notés" value={String(logged.length)} unit="/ 7" />
        </View>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
          Objectif {formatNumber(goal)} kcal · protéines {Math.round(avg("proteins"))} g · glucides{" "}
          {Math.round(avg("carbs"))} g · lipides {Math.round(avg("fats"))} g
        </Text>
      </Card>

      <Card style={{ padding: 16 }}>
        <BarChart
          goal={goal}
          data={days.map((d) => ({
            label: d.label,
            value: d.calories,
            highlight: d.date === today ? true : undefined,
          }))}
        />
      </Card>

      <SectionTitle>Détail par jour</SectionTitle>
      <Card>
        {days.map((d, i) => {
          const pct = goal > 0 ? Math.min(d.calories / goal, 1) : 0;
          const over = d.calories > goal;
          return (
            <Pressable
              key={d.date}
              disabled={d.future}
              onPress={() => openDay(d.date)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderTopWidth: i === 0 ? 0 : 0.5,
                borderTopColor: colors.separator,
                backgroundColor: pressed ? colors.fill : "transparent",
                opacity: d.future ? 0.4 : 1,
              })}
            >
              <Text style={{ width: 70, fontSize: 15, color: colors.textPrimary }}>
                {d.label} {parseDateISO(d.date).getDate()}
              </Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: "hidden" }}>
                <View
                  style={{
                    width: `${pct * 100}%`,
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor: over ? colors.accent.warning : colors.accent.calories,
                  }}
                />
              </View>
              <Text
                style={{
                  width: 76,
                  textAlign: "right",
                  fontSize: 15,
                  color: d.calories > 0 ? colors.textPrimary : colors.textMuted,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {d.calories > 0 ? `${formatNumber(d.calories)} kcal` : "–"}
              </Text>
              {!d.future && <SymbolView name="chevron.right" size={12} tintColor={colors.textMuted} />}
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}

const PERIODS = [
  { value: "4", label: "4 semaines" },
  { value: "8", label: "8 semaines" },
  { value: "12", label: "12 semaines" },
] as const;

function TrendsView() {
  const colors = useThemeColors();
  const goal = useSettingsStore((s) => s.goals.calories) ?? 2100;
  const today = useToday();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("4");

  const currentMonday = mondayOf(today);
  const startDate = addDays(currentMonday, -(Number(period) - 1) * 7);
  const summaries = useWeekSummaries(startDate);
  const trend = useMemo(() => computeTrend(summaries, currentMonday), [summaries, currentMonday]);

  const weeks = useMemo(
    () =>
      Array.from({ length: Number(period) }, (_, i) => {
        const weekStart = addDays(startDate, i * 7);
        const row = summaries.find((s) => s.week_start === weekStart);
        return {
          weekStart,
          perDay: row && row.days_logged > 0 ? row.total_calories / row.days_logged : 0,
          days: row?.days_logged ?? 0,
          current: weekStart === currentMonday,
        };
      }),
    [period, startDate, summaries, currentMonday],
  );

  const trendColor =
    trend.direction === "up"
      ? colors.accent.warning
      : trend.direction === "down"
        ? colors.accent.caloriesText
        : colors.textSecondary;

  return (
    <>
      <SegmentedControl options={[...PERIODS]} value={period} onChange={setPeriod} />

      <Card style={{ padding: 16, flexDirection: "row", gap: 12 }}>
        <BigStat
          caption="Moyenne par jour noté"
          value={trend.dailyAverage > 0 ? formatNumber(trend.dailyAverage) : "–"}
          unit="kcal"
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Dernière semaine finie</Text>
          <Text style={{ fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: trendColor }}>
            {trend.direction === "up" ? "+" : trend.direction === "down" ? "−" : ""}
            {trend.pct} %
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>par jour, vs semaines d'avant</Text>
        </View>
      </Card>

      <Card style={{ padding: 16 }}>
        <BarChart
          goal={goal}
          data={weeks.map((w) => ({
            label: shortDate(w.weekStart).replace(".", ""),
            value: Math.round(w.perDay),
            highlight: w.current ? false : undefined,
          }))}
        />
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
          Calories moyennes par jour noté, semaine par semaine. La semaine en cours est en clair.
        </Text>
      </Card>

      <SectionTitle>Détail par semaine</SectionTitle>
      <Card>
        {[...weeks].reverse().map((w, i) => (
          <View
            key={w.weekStart}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 11,
              paddingHorizontal: 16,
              borderTopWidth: i === 0 ? 0 : 0.5,
              borderTopColor: colors.separator,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.textPrimary }}>
                {w.current ? "Cette semaine" : weekLabel(w.weekStart)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                {w.days} jour{w.days > 1 ? "s" : ""} noté{w.days > 1 ? "s" : ""}
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: w.days > 0 ? colors.textPrimary : colors.textMuted, fontVariant: ["tabular-nums"] }}>
              {w.days > 0 ? `${formatNumber(w.perDay)} kcal/j` : "–"}
            </Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function ChevronButton({
  direction,
  label,
  onPress,
  disabled,
}: {
  direction: "left" | "right";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SymbolView
        name={direction === "left" ? "chevron.left" : "chevron.right"}
        size={15}
        weight="semibold"
        tintColor={colors.accent.caloriesText}
      />
    </PressableScale>
  );
}
