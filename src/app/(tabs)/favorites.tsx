import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { useDb } from "@/app/_layout";
import { QuickActions } from "@/components/nutrition/quick-actions";
import { Card } from "@/components/ui/card";
import { ProductThumb } from "@/components/ui/product-thumb";
import { CATEGORIES } from "@/constants/categories";
import { getFavorites } from "@/db/queries/favorites";
import type { FavoriteWithProduct } from "@/db/queries/favorites";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { useSingleNavigation } from "@/hooks/use-single-navigation";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatNumber } from "@/lib/nutrition-utils";
import { matchesQuery } from "@/lib/search";

export default function FavoritesScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useSingleNavigation();

  useRefreshOnFocus(
    useCallback(() => {
      getFavorites(db).then((data) => {
        setFavorites(data);
        setLoaded(true);
      });
    }, [db]),
  );

  const filtered = useMemo(
    () => favorites.filter((f) => matchesQuery(query, f.name, f.brand)),
    [favorites, query],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <QuickActions />

      {favorites.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 10,
            paddingHorizontal: 10,
          }}
        >
          <SymbolView name="magnifyingglass" size={16} tintColor={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Chercher parmi ${favorites.length} favoris`}
            placeholderTextColor={colors.textSecondary}
            clearButtonMode="while-editing"
            autoCorrect={false}
            style={{ flex: 1, paddingVertical: 10, fontSize: 17, color: colors.textPrimary }}
          />
        </View>
      )}

      {loaded && favorites.length === 0 && (
        <View style={{ alignItems: "center", marginTop: 40, gap: 12, paddingHorizontal: 24 }}>
          <SymbolView name="heart" tintColor={colors.textMuted} size={40} />
          <Text style={{ fontSize: 17, fontWeight: "600", color: colors.textPrimary }}>Aucun favori</Text>
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 21 }}>
            Scanne ou cherche un produit, puis touche le cœur pour le retrouver dans l'écran d'ajout.
          </Text>
        </View>
      )}

      {CATEGORIES.map((cat) => {
        const items = filtered.filter((f) => f.category === cat.type);
        if (items.length === 0) return null;
        return (
          <View key={cat.type} style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 16, textTransform: "uppercase" }}>
              {cat.label}
            </Text>
            <Card>
              {items.map((fav, i) => {
                const qty = fav.favorite_quantity ?? fav.last_quantity;
                return (
                  <Pressable
                    key={fav.id}
                    onPress={() => navigate(() => router.push(`/product/${encodeURIComponent(fav.id)}`))}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      backgroundColor: pressed ? colors.fill : "transparent",
                    })}
                  >
                    {i > 0 && (
                      <View
                        style={{ position: "absolute", top: 0, left: 68, right: 0, height: 0.5, backgroundColor: colors.separator }}
                      />
                    )}
                    <ProductThumb uri={fav.image_url} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 16, color: colors.textPrimary }}>
                        {fav.name}
                      </Text>
                      <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
                        {formatNumber(qty)} g · {formatNumber((fav.calories * qty) / 100)} kcal
                        {fav.brand ? ` · ${fav.brand}` : ""}
                      </Text>
                    </View>
                    <SymbolView name="chevron.right" size={13} tintColor={colors.textMuted} />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        );
      })}

      {favorites.length > 0 && filtered.length === 0 && (
        <Text style={{ textAlign: "center", color: colors.textSecondary, fontSize: 15, marginTop: 24 }}>
          Aucun favori ne correspond à « {query.trim()} »
        </Text>
      )}
    </ScrollView>
  );
}
