import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
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
    openSharedDatabase().then((database) => {
      setDb(database);
      syncWidgetData(database).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsub = useSettingsStore.subscribe((state) => {
      syncWidgetData(db).catch(() => {});
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
