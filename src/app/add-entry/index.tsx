import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SymbolView } from "expo-symbols";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { getRecentProducts } from "@/db/queries/products";
import { ProductRow } from "@/components/nutrition/product-row";
import type { ProductRow as ProductRowType } from "@/types/database";

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}

function ActionButton({ icon, label, onPress, colors }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 14,
        borderCurve: "continuous",
        paddingVertical: 16,
        paddingHorizontal: 18,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SymbolView
        name={icon as never}
        size={22}
        tintColor={colors.accent.calories}
      />
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.textPrimary,
          marginLeft: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AddEntryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useThemeColors();
  const [recentProducts, setRecentProducts] = useState<ProductRowType[]>([]);

  const loadRecents = useCallback(async () => {
    const products = await getRecentProducts(db, 10);
    setRecentProducts(products);
  }, [db]);

  useEffect(() => {
    loadRecents();
  }, [loadRecents]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <ActionButton
        icon="barcode.viewfinder"
        label="Scanner un code-barres"
        onPress={() => router.push("/add-entry/scan")}
        colors={colors}
      />
      <ActionButton
        icon="magnifyingglass"
        label="Rechercher un produit"
        onPress={() => router.push("/add-entry/search")}
        colors={colors}
      />
      <ActionButton
        icon="bolt.fill"
        label="Repas rapide"
        onPress={() => router.push("/add-entry/quick-meal")}
        colors={colors}
      />
      <ActionButton
        icon="square.and.pencil"
        label="Saisie manuelle"
        onPress={() => router.push("/add-entry/manual")}
        colors={colors}
      />

      {recentProducts.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 8,
              paddingHorizontal: 4,
            }}
          >
            Recents
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {recentProducts.map((product, index) => (
              <View key={product.id}>
                {index > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.separator,
                      marginLeft: 68,
                    }}
                  />
                )}
                <ProductRow
                  name={product.name}
                  brand={product.brand}
                  imageUrl={product.image_url}
                  calories={product.calories}
                  onPress={() =>
                    router.push(`/add-entry/confirm?productId=${product.id}`)
                  }
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
