import { Pressable, Text, View } from "react-native";

import { MEALS } from "@/constants/meals";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useSettingsStore } from "@/stores/settings-store";
import type { MealType } from "@/types/nutrition";

interface MealSelectorProps {
  value: MealType;
  onChange: (meal: MealType) => void;
  wrap?: boolean;
}

export function MealSelector({ value, onChange, wrap }: MealSelectorProps) {
  const colors = useThemeColors();
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);
  const visibleMeals = MEALS.filter((m) => enabledMeals[m.type]);

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: wrap ? "wrap" : undefined,
        gap: 8,
      }}
    >
      {visibleMeals.map((meal) => {
        const isSelected = value === meal.type;
        return (
          <Pressable
            key={meal.type}
            onPress={() => onChange(meal.type)}
            style={({ pressed }) => ({
              flex: wrap ? undefined : 1,
              minWidth: wrap ? "40%" : undefined,
              paddingVertical: wrap ? 10 : 8,
              paddingHorizontal: wrap ? 12 : 6,
              borderRadius: 10,
              borderCurve: "continuous",
              borderWidth: 1.5,
              borderColor: isSelected
                ? colors.accent.calories
                : colors.separator,
              backgroundColor: isSelected
                ? colors.isDark
                  ? "rgba(74,222,128,0.12)"
                  : "rgba(22,163,74,0.08)"
                : "transparent",
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: wrap ? 14 : 12,
                fontWeight: isSelected ? "600" : "500",
                color: isSelected
                  ? colors.accent.calories
                  : wrap
                    ? colors.textPrimary
                    : colors.textSecondary,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {meal.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
