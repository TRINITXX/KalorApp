import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Stack } from "expo-router/stack";

import { useThemeColors } from "@/hooks/use-theme-colors";

export default function AddEntryLayout() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundSecondary },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Ajouter",
          headerLeft: () => (
            <Pressable onPress={() => router.dismissAll()} hitSlop={8}>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.accent.calories,
                  fontWeight: "500",
                }}
              >
                Fermer
              </Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="scan"
        options={{ title: "Scanner", headerShown: false }}
      />
      <Stack.Screen name="search" options={{ title: "Rechercher" }} />
      <Stack.Screen name="manual" options={{ title: "Saisie manuelle" }} />
      <Stack.Screen name="confirm" options={{ title: "Confirmer" }} />
      <Stack.Screen name="quick-meal" options={{ title: "Repas rapide" }} />
    </Stack>
  );
}
