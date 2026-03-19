import { Stack } from "expo-router/stack";

import { useThemeColors } from "@/hooks/use-theme-colors";

export default function AddEntryLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundSecondary },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ajouter" }} />
      <Stack.Screen
        name="scan"
        options={{ title: "Scanner", headerShown: false }}
      />
      <Stack.Screen name="search" options={{ title: "Rechercher" }} />
      <Stack.Screen name="manual" options={{ title: "Saisie manuelle" }} />
      <Stack.Screen name="confirm" options={{ title: "Confirmer" }} />
    </Stack>
  );
}
