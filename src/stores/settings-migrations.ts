/** Version of the persisted settings; bump it with a new step below. */
export const SETTINGS_VERSION = 1;

/**
 * Upgrades settings saved by an older version of the app.
 * v1: the user never has a snack, so it is hidden (still re-enabled in Réglages).
 */
export function migrateSettings(persisted: unknown, version: number): unknown {
  const state = (persisted ?? {}) as { enabledMeals?: Record<string, boolean> };
  if (version < 1 && state.enabledMeals) {
    state.enabledMeals = { ...state.enabledMeals, snack: false };
  }
  return state;
}
