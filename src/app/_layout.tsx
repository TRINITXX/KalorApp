import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { Stack } from "expo-router/stack";
import type { SQLiteDatabase } from "expo-sqlite";

import { openSharedDatabase } from "@/db/client";
import { useSettingsStore } from "@/stores/settings-store";
import { syncWidgetData } from "@/lib/widget-sync";

const DbContext = createContext<SQLiteDatabase | null>(null);

export function useDb(): SQLiteDatabase {
  const db = useContext(DbContext);
  if (!db) throw new Error("Database not initialized");
  return db;
}

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    openSharedDatabase().then(async (database) => {
      setDb(database);
      // Wait for Zustand hydration so goals are loaded from MMKV
      if (!useSettingsStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          useSettingsStore.persist.onFinishHydration(() => resolve());
        });
      }
      syncWidgetData(database).catch(console.warn);
    });
  }, []);

  // Re-sync widget when app returns to foreground
  useEffect(() => {
    if (!db) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncWidgetData(db).catch(console.warn);
      }
    });
    return () => sub.remove();
  }, [db]);

  useEffect(() => {
    if (!db) return;
    const unsub = useSettingsStore.subscribe(() => {
      syncWidgetData(db).catch(console.warn);
    });
    return unsub;
  }, [db]);

  if (!db) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme === "dark" ? "#000" : "#fff",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <DbContext.Provider value={db}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme === "dark" ? "#000" : "#fff",
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, title: "" }}
        />
        <Stack.Screen
          name="add-entry"
          options={{
            presentation: "fullScreenModal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="product/[id]"
          options={{ headerShown: true, title: "Détail produit" }}
        />
        <Stack.Screen
          name="quick-add"
          options={{ presentation: "formSheet", sheetGrabberVisible: true }}
        />
      </Stack>
    </DbContext.Provider>
  );
}
