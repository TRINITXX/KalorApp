import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Image, type ImageStyle } from "expo-image";
import { SymbolView } from "expo-symbols";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  getFavorites,
  removeFavorite,
  updateFavoriteQuantity,
} from "@/db/queries/favorites";
import type { FavoriteWithProduct } from "@/db/queries/favorites";
import { QuantityInput } from "@/components/nutrition/quantity-input";

export default function FavoritesScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    const data = await getFavorites(db);
    setFavorites(data);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

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
      {/* Action buttons */}
      <View style={{ gap: 8, marginBottom: 8 }}>
        <ActionButton
          icon="barcode.viewfinder"
          label="Scanner un produit"
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
          icon="square.and.pencil"
          label="Saisie manuelle"
          onPress={() => router.push("/add-entry/manual")}
          colors={colors}
        />
      </View>

      {favorites.length === 0 && (
        <View style={{ alignItems: "center", marginTop: 32, gap: 12 }}>
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

      {favorites.map((fav) => {
        const isExpanded = expandedId === fav.id;
        return (
          <View
            key={fav.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            {/* Main row — tap to expand */}
            <Pressable
              onPress={() => setExpandedId(isExpanded ? null : fav.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                gap: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
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
                  <Text style={{ fontSize: 22, color: colors.textMuted }}>
                    ?
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
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
                  {fav.favorite_quantity ?? fav.last_quantity}g
                </Text>
              </View>

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
            </Pressable>

            {/* Expanded: quantity input */}
            {isExpanded && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 12,
                  paddingBottom: 12,
                  paddingTop: 4,
                  borderTopWidth: 1,
                  borderTopColor: colors.separator,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Quantite par defaut
                </Text>
                <QuantityInput
                  value={fav.favorite_quantity ?? fav.last_quantity}
                  onChange={(v) => {
                    updateFavoriteQuantity(db, fav.id, v);
                    setFavorites((prev) =>
                      prev.map((f) =>
                        f.id === fav.id ? { ...f, favorite_quantity: v } : f,
                      ),
                    );
                  }}
                />
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

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
        paddingVertical: 14,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SymbolView
        name={icon as never}
        size={20}
        tintColor={colors.accent.calories}
      />
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: colors.textPrimary,
          marginLeft: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
