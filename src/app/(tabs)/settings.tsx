import { View, Text } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

export default function SettingsScreen() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Reglages</Text>
    </View>
  );
}
