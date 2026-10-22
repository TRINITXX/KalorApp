import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS-style segmented control: gray track, raised pill on the chosen option. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useThemeColors();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: colors.isDark ? colors.card : colors.fill,
        borderRadius: 9,
        borderCurve: "continuous",
        padding: 2,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 7,
              borderCurve: "continuous",
              alignItems: "center",
              backgroundColor: active
                ? colors.isDark
                  ? "#636366"
                  : colors.card
                : "transparent",
              boxShadow: active && !colors.isDark
                ? "0px 1px 3px rgba(0,0,0,0.12)"
                : undefined,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: active ? "600" : "500",
                color: colors.textPrimary,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
