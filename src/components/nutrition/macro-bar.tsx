import { Text, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface MacroBarProps {
  label: string;
  current: number;
  goal: number | null;
  color: string;
  unit?: string;
}

export function MacroBar({
  label,
  current,
  goal,
  color,
  unit = "g",
}: MacroBarProps) {
  const colors = useThemeColors();

  const ratio = goal && goal > 0 ? Math.min(current / goal, 1) : 0;
  const widthPercent = `${Math.round(ratio * 100)}%` as const;

  return (
    <View style={{ gap: 4 }}>
      {/* Label */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: colors.textSecondary,
        }}
      >
        {label}
      </Text>

      {/* Progress bar */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          borderCurve: "continuous",
          backgroundColor: colors.card,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: widthPercent,
            borderRadius: 3,
            borderCurve: "continuous",
            backgroundColor: color,
          }}
        />
      </View>

      {/* Value text */}
      <Text
        selectable
        style={{
          fontSize: 12,
          color: colors.textMuted,
          fontVariant: ["tabular-nums"],
        }}
      >
        {goal !== null
          ? `${Math.round(current)} / ${Math.round(goal)} ${unit}`
          : `${Math.round(current)} ${unit}`}
      </Text>
    </View>
  );
}
