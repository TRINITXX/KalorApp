import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image, type ImageStyle } from "expo-image";
import { SymbolView } from "expo-symbols";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getFavorites, removeFavorite } from "@/db/queries/favorites";
import type { FavoriteWithProduct } from "@/db/queries/favorites";

export default function FavoritesScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);

  const loadFavorites = useCallback(async () => {
    const data = await getFavorites(db);
    setFavorites(data);
  }, [db]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = useCallback(
    async (productId: string, productName: string) => {
      Alert.alert(
        "Retirer des favoris",
        `Retirer "${productName}" des favoris ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Retirer",
            style: "destructive",
            onPress: async () => {
              await removeFavorite(db, productId);
              await loadFavorites();
            },
          },
        ],
      );
    },
    [db, loadFavorites],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {favorites.length === 0 && (
        <View style={{ alignItems: "center", marginTop: 48, gap: 12 }}>
          <SymbolView name="heart" tintColor={colors.textMuted} size={40} />
          <Text
            style={{
              fontSize: 16,
              color: colors.textMuted,
              textAlign: "center",
              lineHeight: 24,
            }}
          >
            Aucun favori pour l'instant.{"\n"}Scannez ou recherchez un produit
            et appuyez sur le coeur pour l'ajouter.
          </Text>
        </View>
      )}

      {favorites.map((fav) => (
        <View
          key={fav.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: 12,
            borderCurve: "continuous",
            padding: 12,
            gap: 12,
          }}
        >
          {/* Image */}
          {fav.image_url ? (
            <Image
              source={{ uri: fav.image_url }}
              style={
                {
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  borderCurve: "continuous",
                } as unknown as ImageStyle
              }
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                borderCurve: "continuous",
                backgroundColor: colors.isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22, color: colors.textMuted }}>?</Text>
            </View>
          )}

          {/* Info — tap to open product detail */}
          <Pressable
            onPress={() => router.push(`/product/${fav.id}`)}
            style={{ flex: 1 }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {fav.name}
            </Text>
            {fav.brand ? (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {fav.brand}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 12,
                color: colors.textMuted,
                marginTop: 2,
                fontVariant: ["tabular-nums"],
              }}
            >
              {Math.round(fav.calories)} kcal / 100g
            </Text>
          </Pressable>

          {/* Remove button */}
          <Pressable
            onPress={() => handleRemove(fav.id, fav.name)}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <SymbolView
              name="heart.fill"
              size={22}
              tintColor={colors.accent.error}
            />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
