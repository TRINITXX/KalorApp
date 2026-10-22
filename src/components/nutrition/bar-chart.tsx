import { Text, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface BarChartProps {
  data: { label: string; value: number; highlight?: boolean }[];
  goal?: number;
  height?: number;
}

const LABEL_HEIGHT = 20;

/** Plain bar chart with a dashed goal line; bars above the goal turn orange. */
export function BarChart({ data, goal, height = 160 }: BarChartProps) {
  const colors = useThemeColors();
  const max = Math.max(...data.map((d) => d.value), goal ?? 0, 1) * 1.08;
  const plot = height - LABEL_HEIGHT;

  return (
    <View style={{ height }}>
      {goal != null && goal > 0 && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: LABEL_HEIGHT + (goal / max) * plot,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.textMuted,
          }}
        />
      )}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        {data.map((d, i) => {
          const over = goal != null && goal > 0 && d.value > goal;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: "68%",
                  height: d.value > 0 ? Math.max((d.value / max) * plot, 4) : 3,
                  borderRadius: 5,
                  borderCurve: "continuous",
                  backgroundColor:
                    d.value === 0
                      ? colors.fill
                      : over
                        ? colors.accent.warning
                        : colors.accent.calories,
                  opacity: d.highlight === false ? 0.45 : 1,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  height: LABEL_HEIGHT,
                  paddingTop: 5,
                  fontSize: 11,
                  color: d.highlight ? colors.textPrimary : colors.textSecondary,
                  fontWeight: d.highlight ? "700" : "400",
                }}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
