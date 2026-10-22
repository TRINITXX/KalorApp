import { migrateSettings } from "@/stores/settings-migrations";

describe("migrateSettings", () => {
  it("hides the snack in settings saved before version 1", () => {
    const saved = {
      theme: "dark",
      enabledMeals: { breakfast: false, lunch: true, snack: true, dinner: true },
    };
    expect(migrateSettings(saved, 0)).toEqual({
      theme: "dark",
      enabledMeals: { breakfast: false, lunch: true, snack: false, dinner: true },
    });
  });

  it("keeps a snack switched back on after the upgrade", () => {
    const saved = { enabledMeals: { breakfast: false, lunch: true, snack: true, dinner: true } };
    expect(migrateSettings(saved, 1)).toEqual(saved);
  });
});
