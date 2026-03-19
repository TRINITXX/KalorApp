export const COLORS = {
  dark: {
    background: "#000000",
    backgroundSecondary: "#111111",
    card: "#1a1a1a",
    textPrimary: "#ffffff",
    textSecondary: "#888888",
    textMuted: "#666666",
    separator: "#222222",
  },
  light: {
    background: "#ffffff",
    backgroundSecondary: "#f5f5f5",
    card: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    separator: "#e5e7eb",
  },
  accent: {
    calories: { dark: "#4ade80", light: "#16a34a" },
    proteins: { dark: "#60a5fa", light: "#2563eb" },
    carbs: { dark: "#fbbf24", light: "#d97706" },
    fats: { dark: "#f87171", light: "#dc2626" },
    error: { dark: "#ef4444", light: "#dc2626" },
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
