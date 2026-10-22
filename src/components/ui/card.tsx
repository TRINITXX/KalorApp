import { View, type ViewProps } from "react-native";

import { RADIUS } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";

/** Gray rounded surface on the grouped background (iOS inset grouped look). */
export function Card({ style, ...rest }: ViewProps) {
  const colors = useThemeColors();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: RADIUS.card,
          borderCurve: "continuous",
          overflow: "hidden",
        },
        style,
      ]}
    />
  );
}
