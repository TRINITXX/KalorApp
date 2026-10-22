import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/nutrition-utils";
import { useThemeColors } from "@/hooks/use-theme-colors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE = Easing.out(Easing.cubic);

interface DaySummaryCardProps {
  calories: number;
  calorieGoal: number;
  proteins: number;
  carbs: number;
  fats: number;
  goals: { proteins: number | null; carbs: number | null; fats: number | null };
}

/** Calorie ring (consumed over goal) beside the three macro bars. */
export function DaySummaryCard({
  calories,
  calorieGoal,
  proteins,
  carbs,
  fats,
  goals,
}: DaySummaryCardProps) {
  const colors = useThemeColors();
  const over = calories - calorieGoal;

  return (
    <Card style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 16 }}>
      <CalorieRing value={calories} goal={calorieGoal} />
      <View style={{ flex: 1, gap: 12, minWidth: 0 }}>
        <MacroBar label="Protéines" value={proteins} goal={goals.proteins} color={colors.accent.proteins} />
        <MacroBar label="Glucides" value={carbs} goal={goals.carbs} color={colors.accent.carbs} />
        <MacroBar label="Lipides" value={fats} goal={goals.fats} color={colors.accent.fats} />
        {over > 0 && (
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.accent.warning }}>
            {formatNumber(over)} kcal au-dessus de l'objectif
          </Text>
        )}
      </View>
    </Card>
  );
}

function CalorieRing({ value, goal }: { value: number; goal: number }) {
  const colors = useThemeColors();
  const size = 118;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    const ratio = goal > 0 ? Math.min(value / goal, 1) : 0;
    progress.value = withTiming(ratio, { duration: 700, easing: EASE });
  }, [value, goal, progress]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      accessible
      accessibilityLabel={`${Math.round(value)} kilocalories sur ${goal}`}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <LinearGradient id="calorie-ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.isDark ? "#a6ff6b" : "#7be495"} />
            <Stop offset="1" stopColor={colors.accent.calories} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent.calories}
          strokeOpacity={0.2}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#calorie-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={arcProps}
          fill="none"
        />
      </Svg>
      <Text
        style={{
          fontSize: 26,
          fontWeight: "800",
          letterSpacing: -0.5,
          color: colors.textPrimary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatNumber(value)}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, fontVariant: ["tabular-nums"] }}>
        / {formatNumber(goal)} kcal
      </Text>
    </View>
  );
}

function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number | null;
  color: string;
}) {
  const colors = useThemeColors();
  const width = useSharedValue(0);

  useEffect(() => {
    const ratio = goal && goal > 0 ? Math.min(value / goal, 1) : 0;
    width.value = withTiming(ratio, { duration: 700, easing: EASE });
  }, [value, goal, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: colors.textPrimary, flexShrink: 1 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, fontVariant: ["tabular-nums"] }}>
          {Math.round(value)}
          {goal != null ? `/${Math.round(goal)}` : ""} g
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: "hidden" }}>
        <Animated.View style={[{ height: "100%", borderRadius: 3, backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}
