import { Pressable, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
}

/** Dark pill shown after a deletion, with an "Annuler" action. */
export function UndoToast({ message, onUndo }: UndoToastProps) {
  const colors = useThemeColors();
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(160)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        alignSelf: "center",
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: colors.isDark ? "#3a3a3c" : "#1c1c1e",
        boxShadow: "0px 6px 20px rgba(0,0,0,0.25)",
      }}
    >
      <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 14, flexShrink: 1 }}>
        {message}
      </Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => ({
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: pressed ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)",
        })}
      >
        <Text style={{ color: "#30d158", fontSize: 14, fontWeight: "700" }}>Annuler</Text>
      </Pressable>
    </Animated.View>
  );
}
