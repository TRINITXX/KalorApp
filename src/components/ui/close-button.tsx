import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";

import { useThemeColors } from "@/hooks/use-theme-colors";

/** "Fermer" header button for a screen opened as the first page of a modal. */
export function CloseButton() {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
      <Text style={{ fontSize: 17, color: colors.accent.caloriesText }}>Fermer</Text>
    </Pressable>
  );
}
