import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { CATEGORIES } from "@/constants/categories";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ProductCategory } from "@/types/database";

interface CategorySelectorProps {
  value: ProductCategory;
  onChange: (category: ProductCategory) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const colors = useThemeColors();

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {CATEGORIES.map((cat) => {
        const isSelected = value === cat.type;
        return (
          <Pressable
            key={cat.type}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(cat.type);
            }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 6,
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
                fontSize: 12,
                fontWeight: isSelected ? "600" : "500",
                color: isSelected
                  ? colors.accent.calories
                  : colors.textSecondary,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
