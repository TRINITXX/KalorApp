import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getRecentProducts } from "@/db/queries/products";
import { getFavorites } from "@/db/queries/favorites";
import type { FavoriteWithProduct } from "@/db/queries/favorites";
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
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.card,
        borderRadius: 14,
        borderCurve: "continuous",
        paddingVertical: 16,
        gap: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SymbolView
        name={icon as never}
        size={24}
        tintColor={colors.accent.calories}
      />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.textPrimary,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AddEntryScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [recentProducts, setRecentProducts] = useState<ProductRowType[]>([]);

  const loadData = useCallback(async () => {
    const [favs, recents] = await Promise.all([
      getFavorites(db),
      getRecentProducts(db, 10),
    ]);
    setFavorites(favs);
    setRecentProducts(recents);
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      {/* 4x1 row */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <ActionButton
          icon="barcode.viewfinder"
          label="Scanner"
          onPress={() => router.push("/add-entry/scan")}
          colors={colors}
        />
        <ActionButton
          icon="magnifyingglass"
          label="Rechercher"
          onPress={() => router.push("/add-entry/search")}
          colors={colors}
        />
        <ActionButton
          icon="bolt.fill"
          label="Rapide"
          onPress={() => router.push("/add-entry/quick-meal")}
          colors={colors}
        />
        <ActionButton
          icon="square.and.pencil"
          label="Manuel"
          onPress={() => router.push("/add-entry/manual")}
          colors={colors}
        />
      </View>

      {favorites.length > 0 && (
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
            Favoris
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {favorites.map((fav, index) => (
              <View key={fav.id}>
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
                  name={fav.name}
                  brand={fav.brand}
                  imageUrl={fav.image_url}
                  calories={fav.calories}
                  onPress={() =>
                    router.push(`/add-entry/confirm?productId=${fav.id}`)
                  }
                />
              </View>
            ))}
          </View>
        </View>
      )}

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
