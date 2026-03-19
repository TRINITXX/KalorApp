import { View, Text } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

export default function DashboardScreen() {
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
      <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Dashboard</Text>
    </View>
  );
}
