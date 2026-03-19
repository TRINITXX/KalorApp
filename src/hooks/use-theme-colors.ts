import { useMemo } from "react";

import { COLORS } from "@/constants/theme";
import { useSettingsStore } from "@/stores/settings-store";

export function useThemeColors() {
  const theme = useSettingsStore((s) => s.theme);
  return useMemo(
    () => ({
      ...COLORS[theme],
      accent: {
        calories: COLORS.accent.calories[theme],
        proteins: COLORS.accent.proteins[theme],
        carbs: COLORS.accent.carbs[theme],
        fats: COLORS.accent.fats[theme],
        error: COLORS.accent.error[theme],
      },
      isDark: theme === "dark",
    }),
    [theme],
  );
}
