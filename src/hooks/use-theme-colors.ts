import { useMemo } from "react";
import { useColorScheme } from "react-native";

import { COLORS } from "@/constants/theme";
import { useSettingsStore } from "@/stores/settings-store";

export type ThemeColors = ReturnType<typeof useThemeColors>;

/** "dark" or "light" once the "follow the iPhone" setting is resolved. */
export function useResolvedTheme(): "dark" | "light" {
  const setting = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  if (setting === "system") return system === "light" ? "light" : "dark";
  return setting;
}

export function useThemeColors() {
  const theme = useResolvedTheme();
  return useMemo(
    () => ({
      ...COLORS[theme],
      accent: {
        calories: COLORS.accent.calories[theme],
        caloriesText: COLORS.accent.caloriesText[theme],
        proteins: COLORS.accent.proteins[theme],
        carbs: COLORS.accent.carbs[theme],
        fats: COLORS.accent.fats[theme],
        error: COLORS.accent.error[theme],
        warning: COLORS.accent.warning[theme],
      },
      onAccent: COLORS.onAccent,
      isDark: theme === "dark",
    }),
    [theme],
  );
}
