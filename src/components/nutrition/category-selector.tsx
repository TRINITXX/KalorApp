import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { CATEGORIES } from "@/constants/categories";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ProductCategory } from "@/types/database";

interface CategorySelectorProps {
  value: ProductCategory;
  onChange: (category: ProductCategory) => void;
}

/** The 4 categories of the add screen, as a 2 by 2 grid of chips. */
export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const colors = useThemeColors();

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {CATEGORIES.map((cat) => {
        const selected = value === cat.type;
        return (
          <Pressable
            key={cat.type}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(cat.type);
            }}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: "45%",
              paddingVertical: 10,
              borderRadius: 10,
              borderCurve: "continuous",
              alignItems: "center",
              backgroundColor: selected ? colors.accent.calories : colors.card,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 15,
                fontWeight: selected ? "600" : "400",
                color: selected ? colors.onAccent : colors.textPrimary,
              }}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
