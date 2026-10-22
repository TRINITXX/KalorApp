import { ActivityIndicator, Text, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { RADIUS } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** "filled" is the green call to action, "tinted" a quieter gray one. */
  variant?: "filled" | "tinted";
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "filled",
  style,
}: PrimaryButtonProps) {
  const colors = useThemeColors();
  const filled = variant === "filled";

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          height: 50,
          borderRadius: RADIUS.pill,
          backgroundColor: filled ? colors.accent.calories : colors.card,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={filled ? colors.onAccent : colors.textPrimary} />
      ) : (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: filled ? colors.onAccent : colors.accent.caloriesText,
          }}
        >
          {label}
        </Text>
      )}
    </PressableScale>
  );
}
