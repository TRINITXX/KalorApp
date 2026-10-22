import { migrateSettings } from "@/stores/settings-migrations";

describe("migrateSettings", () => {
  it("hides the snack in settings saved before version 1", () => {
    const saved = {
      theme: "dark",
      enabledMeals: { breakfast: false, lunch: true, snack: true, dinner: true },
    };
    expect(migrateSettings(saved, 0)).toMatchObject({
      enabledMeals: { breakfast: false, lunch: true, snack: false, dinner: true },
    });
  });

  it("keeps a snack switched back on after the upgrade", () => {
    const saved = { enabledMeals: { breakfast: false, lunch: true, snack: true, dinner: true } };
    expect(migrateSettings(saved, 1)).toMatchObject(saved);
  });

  it("makes the app follow the iPhone's light or dark mode from version 2", () => {
    expect(migrateSettings({ theme: "dark" }, 1)).toEqual({ theme: "system" });
    expect(migrateSettings({ theme: "light" }, 2)).toEqual({ theme: "light" });
  });
});
