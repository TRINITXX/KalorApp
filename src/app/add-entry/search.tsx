import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDb } from "@/app/_layout";
import { CheckCircle } from "@/components/ui/check-circle";
import { CloseButton } from "@/components/ui/close-button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ProductThumb } from "@/components/ui/product-thumb";
import { addFavorite } from "@/db/queries/favorites";
import { upsertProduct } from "@/db/queries/products";
import { useDebounce } from "@/hooks/use-debounce";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { fetchProduct, searchProducts, type SearchResult } from "@/lib/open-food-facts";
import { formatNumber } from "@/lib/nutrition-utils";
import { flattenProductForDb } from "@/lib/product-utils";
import { useCheckedProductsStore } from "@/stores/checked-products-store";

/**
 * OpenFoodFacts search. Opened from the add screen (mode=pick), the checked
 * products come back selected there. Opened from Favorites, they become favorites.
 */
export default function SearchScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { mode, q } = useLocalSearchParams<{ mode?: string; q?: string }>();
  const picking = mode === "pick";

  const [query, setQuery] = useState(q ?? "");
  const debouncedQuery = useDebounce(query.trim(), 350);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    searchProducts(debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleToggle = useCallback(
    async (result: SearchResult) => {
      if (fetchingId) return;
      if (checkedIds.includes(result.id)) {
        Haptics.selectionAsync();
        setCheckedIds((prev) => prev.filter((id) => id !== result.id));
        return;
      }
      setFetchingId(result.id);
      try {
        // The search result has no macros: only the full product sheet is saved.
        const full = await fetchProduct(result.id);
        if (!full) {
          Alert.alert(
            "Fiche introuvable",
            "OpenFoodFacts ne donne pas les valeurs de ce produit. Crée-le à la main.",
          );
          return;
        }
        await upsertProduct(db, flattenProductForDb(full));
        if (!picking) await addFavorite(db, result.id);
        Haptics.selectionAsync();
        setCheckedIds((prev) => [...prev, result.id]);
      } catch {
        Alert.alert("Pas de réseau", "Le produit n'a pas pu être chargé. Réessaie.");
      } finally {
        setFetchingId(null);
      }
    },
    [checkedIds, db, fetchingId, picking],
  );

  const handleValidate = useCallback(() => {
    if (picking) useCheckedProductsStore.getState().pick(checkedIds);
    router.back();
  }, [checkedIds, picking, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerLeft: picking ? undefined : () => <CloseButton /> }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 10,
            borderCurve: "continuous",
            paddingHorizontal: 10,
          }}
        >
          <SymbolView name="magnifyingglass" size={16} tintColor={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Produit ou marque"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            style={{ flex: 1, paddingVertical: 10, fontSize: 17, color: colors.textPrimary }}
          />
        </View>
      </View>

      {status === "loading" && <ActivityIndicator style={{ marginTop: 24 }} color={colors.textSecondary} />}
      {status === "error" && (
        <Text style={{ textAlign: "center", color: colors.textSecondary, fontSize: 15, marginTop: 32, paddingHorizontal: 32 }}>
          Recherche impossible. Vérifie ta connexion.
        </Text>
      )}
      {status === "done" && results.length === 0 && (
        <Text style={{ textAlign: "center", color: colors.textSecondary, fontSize: 15, marginTop: 32 }}>
          Aucun résultat sur OpenFoodFacts
        </Text>
      )}

      <FlashList
        data={status === "loading" ? [] : results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: checkedIds.length > 0 ? 110 : 24 }}
        renderItem={({ item }) => {
          const checked = checkedIds.includes(item.id);
          const fetching = fetchingId === item.id;
          return (
            <Pressable
              onPress={() => handleToggle(item)}
              disabled={fetching}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 10,
                paddingHorizontal: 16,
                backgroundColor: pressed ? colors.fill : "transparent",
              })}
            >
              {fetching ? (
                <ActivityIndicator style={{ width: 24, height: 24 }} color={colors.accent.calories} />
              ) : (
                <CheckCircle checked={checked} />
              )}
              <ProductThumb uri={item.image_url} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 16, color: colors.textPrimary }}>
                  {item.name}
                </Text>
                {item.brand ? (
                  <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
                    {item.brand}
                  </Text>
                ) : null}
              </View>
              {item.calories != null && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontVariant: ["tabular-nums"] }}>
                  {formatNumber(item.calories)} kcal/100 g
                </Text>
              )}
            </Pressable>
          );
        }}
      />

      {checkedIds.length > 0 && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.background,
            borderTopWidth: 0.5,
            borderTopColor: colors.separator,
          }}
        >
          <PrimaryButton
            label={
              picking
                ? `Choisir ${checkedIds.length} produit${checkedIds.length > 1 ? "s" : ""}`
                : `${checkedIds.length} ajouté${checkedIds.length > 1 ? "s" : ""} aux favoris`
            }
            onPress={handleValidate}
          />
        </View>
      )}
    </View>
  );
}
