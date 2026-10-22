import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Stack } from "expo-router/stack";

import { CloseButton } from "@/components/ui/close-button";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function AddEntryLayout() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent.caloriesText,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: "700" },
        headerShadowVisible: false,
        headerBackTitle: "Retour",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Ajouter",
          headerLeft: () => (
            <Pressable onPress={() => router.dismissAll()} hitSlop={10} accessibilityRole="button">
              <Text style={{ fontSize: 17, color: colors.accent.caloriesText }}>Fermer</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="scan" options={{ title: "Scanner", headerShown: false }} />
      <Stack.Screen name="search" options={{ title: "Chercher en ligne" }} />
      <Stack.Screen name="manual" options={{ title: "Nouveau produit" }} />
      <Stack.Screen
        name="confirm"
        options={{ title: "Modifier", headerLeft: () => <CloseButton /> }}
      />
    </Stack>
  );
}
