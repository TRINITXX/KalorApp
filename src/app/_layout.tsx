import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import type { SQLiteDatabase } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { openSharedDatabase } from "@/db/client";
import { useResolvedTheme } from "@/hooks/use-theme-colors";
import { useSettingsStore } from "@/stores/settings-store";
import { syncSiriVoiceConfig } from "@/lib/voice/siri-config";
import { syncWidgetData } from "@/lib/widget-sync";

const DbContext = createContext<SQLiteDatabase | null>(null);

export function useDb(): SQLiteDatabase {
  const db = useContext(DbContext);
  if (!db) throw new Error("Database not initialized");
  return db;
}

export default function RootLayout() {
  const theme = useResolvedTheme();
  const background = theme === "dark" ? "#000000" : "#f2f2f7";
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
      syncSiriVoiceConfig();
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
          backgroundColor: background,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: background }}>
      <DbContext.Provider value={db}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: background },
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
            options={{
              headerShown: true,
              title: "Produit",
              headerBackTitle: "Retour",
              headerStyle: { backgroundColor: background },
              headerTintColor: theme === "dark" ? "#30d158" : "#248a3d",
              headerTitleStyle: { color: theme === "dark" ? "#ffffff" : "#000000" },
              headerShadowVisible: false,
            }}
          />
        </Stack>
      </DbContext.Provider>
    </GestureHandlerRootView>
  );
}
