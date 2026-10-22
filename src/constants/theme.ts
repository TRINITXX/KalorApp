// iOS system palette (Health / Fitness look): grouped backgrounds, gray cards,
// green for calories. Dark and light follow Apple's dark/light variants.
export const COLORS = {
  dark: {
    background: "#000000",
    backgroundSecondary: "#000000",
    card: "#1c1c1e",
    fill: "#2c2c2e",
    textPrimary: "#ffffff",
    textSecondary: "#98989f",
    textMuted: "#636366",
    separator: "#38383a",
  },
  light: {
    background: "#f2f2f7",
    backgroundSecondary: "#f2f2f7",
    card: "#ffffff",
    fill: "#e5e5ea",
    textPrimary: "#000000",
    textSecondary: "#6e6e73",
    textMuted: "#aeaeb2",
    separator: "#d1d1d6",
  },
  accent: {
    calories: { dark: "#30d158", light: "#34c759" },
    // Green readable as text (links, "Fermer") on the background.
    caloriesText: { dark: "#30d158", light: "#248a3d" },
    proteins: { dark: "#64d2ff", light: "#0a84ff" },
    carbs: { dark: "#ffd60a", light: "#ff9f0a" },
    fats: { dark: "#ff6961", light: "#ff3b30" },
    error: { dark: "#ff453a", light: "#ff3b30" },
    warning: { dark: "#ff9f0a", light: "#c93400" },
  },
  // Text drawn on a green button: black reads on both green tints.
  onAccent: "#000000",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const RADIUS = {
  card: 16,
  control: 10,
  pill: 999,
} as const;
