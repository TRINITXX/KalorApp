import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";

import { MEALS } from "@/constants/meals";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { EntryRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

interface MealSectionProps {
  meal: MealType;
  entries: EntryRow[];
  onDelete: (id: number) => void;
}

export function MealSection({ meal, entries, onDelete }: MealSectionProps) {
  const colors = useThemeColors();

  const mealInfo = MEALS.find((m) => m.type === meal);
  const label = mealInfo?.label ?? meal;
  const subtotalKcal = entries.reduce((sum, e) => sum + e.calories, 0);

  const handleDelete = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(id);
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderCurve: "continuous",
        padding: 16,
        boxShadow: colors.isDark
          ? "0px 2px 8px rgba(0, 0, 0, 0.3)"
          : "0px 2px 8px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: entries.length > 0 ? 12 : 0,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.textPrimary,
          }}
        >
          {label}
        </Text>
        <Text
          selectable
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {Math.round(subtotalKcal)} kcal
        </Text>
      </View>

      {/* Entries */}
      {entries.map((entry, index) => (
        <View
          key={entry.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            borderTopWidth: index > 0 ? 1 : 0,
            borderTopColor: colors.separator,
          }}
        >
          {/* Entry info */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                color: colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {entry.product_name}
            </Text>
            <Text
              selectable
              style={{
                fontSize: 12,
                color: colors.textMuted,
                fontVariant: ["tabular-nums"],
                marginTop: 2,
              }}
            >
              {Math.round(entry.quantity)}g
            </Text>
          </View>

          {/* Calories */}
          <Text
            selectable
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.textSecondary,
              fontVariant: ["tabular-nums"],
              marginRight: 12,
            }}
          >
            {Math.round(entry.calories)} kcal
          </Text>

          {/* Delete button */}
          <Pressable
            onPress={() => handleDelete(entry.id)}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderCurve: "continuous",
                backgroundColor: colors.isDark
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(239, 68, 68, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#ef4444",
                  lineHeight: 18,
                }}
              >
                -
              </Text>
            </View>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
