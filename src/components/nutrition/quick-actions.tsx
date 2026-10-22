import { Text, View } from "react-native";
import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

import { PressableScale } from "@/components/ui/pressable-scale";
import { useSingleNavigation } from "@/hooks/use-single-navigation";
import { useThemeColors } from "@/hooks/use-theme-colors";

const ACTIONS: { icon: SymbolViewProps["name"]; label: string; route: string }[] = [
  { icon: "barcode.viewfinder", label: "Scanner", route: "/add-entry/scan" },
  { icon: "globe", label: "En ligne", route: "/add-entry/search" },
  { icon: "square.and.pencil", label: "Créer", route: "/add-entry/manual" },
];

/** Scan a barcode, search OpenFoodFacts, or create a product by hand. */
export function QuickActions({ query }: { query?: string }) {
  const colors = useThemeColors();
  const navigate = useSingleNavigation();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {ACTIONS.map((a) => (
        <PressableScale
          key={a.label}
          accessibilityRole="button"
          onPress={() => navigate(() => router.push((query ? `${a.route}?${query}` : a.route) as never))}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
            borderRadius: 10,
            borderCurve: "continuous",
            backgroundColor: colors.card,
          }}
        >
          <SymbolView name={a.icon} size={16} tintColor={colors.accent.caloriesText} />
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textPrimary }}>{a.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}
