import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router/stack";

import { DATABASE_NAME, migrateDbIfNeeded } from "@/db/client";
import { useSettingsStore } from "@/stores/settings-store";

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme === "dark" ? "#000" : "#fff",
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-entry"
          options={{
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
          }}
        />
        <Stack.Screen name="product/[id]" options={{ headerShown: true }} />
        <Stack.Screen
          name="quick-add"
          options={{ presentation: "formSheet", sheetGrabberVisible: true }}
        />
      </Stack>
    </SQLiteProvider>
  );
}
