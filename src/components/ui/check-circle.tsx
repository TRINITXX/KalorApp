import { View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useThemeColors } from "@/hooks/use-theme-colors";

/** Round selection mark, as in iOS lists in edit mode. */
export function CheckCircle({ checked }: { checked: boolean }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: checked ? 0 : 1.5,
        borderColor: colors.textMuted,
        backgroundColor: checked ? colors.accent.calories : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && (
        <SymbolView
          name="checkmark"
          size={13}
          weight="bold"
          tintColor={colors.onAccent}
        />
      )}
    </View>
  );
}
