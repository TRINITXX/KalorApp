/** Version of the persisted settings; bump it with a new step below. */
export const SETTINGS_VERSION = 2;

/**
 * Upgrades settings saved by an older version of the app.
 * v1: the user never has a snack, so it is hidden (still re-enabled in Réglages).
 * v2 (build 1.1.0, which lets iOS switch the app to dark mode): follow the iPhone.
 */
export function migrateSettings(persisted: unknown, version: number): unknown {
  const state = (persisted ?? {}) as { enabledMeals?: Record<string, boolean>; theme?: string };
  if (version < 1 && state.enabledMeals) {
    state.enabledMeals = { ...state.enabledMeals, snack: false };
  }
  if (version < 2) state.theme = "system";
  return state;
}
