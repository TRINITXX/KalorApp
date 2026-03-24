import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useDebounce } from "@/hooks/use-debounce";
import { searchProducts, fetchProduct } from "@/lib/open-food-facts";
import type { SearchResult } from "@/lib/open-food-facts";
import { upsertProduct } from "@/db/queries/products";
import { addFavorite } from "@/db/queries/favorites";
import { flattenProductForDb } from "@/lib/product-utils";
import { useCheckedProductsStore } from "@/stores/checked-products-store";

export default function SearchScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    let cancelled = false;

    const doSearch = async () => {
      setLoading(true);
      try {
        const data = await searchProducts(debouncedQuery);
        if (!cancelled) {
          setResults(data);
          setSearched(true);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearched(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleToggle = useCallback(
    async (result: SearchResult) => {
      if (fetchingId) return;

      // Uncheck
      if (checkedIds.has(result.id)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCheckedIds((prev) => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
        return;
      }

      // Check — fetch full product and save to DB + favorites
      setFetchingId(result.id);
      try {
        const fullProduct = await fetchProduct(result.id);
        if (fullProduct) {
          await upsertProduct(db, flattenProductForDb(fullProduct));
        } else {
          await upsertProduct(db, {
            id: result.id,
            name: result.name,
            brand: result.brand,
            image_url: result.image_url,
            source: "openfoodfacts",
            category: "side" as const,
            calories: result.calories ?? 0,
            proteins: 0,
            carbs: 0,
            fats: 0,
            fiber: null,
            sugars: null,
            saturated_fat: null,
            salt: null,
            last_quantity: 100,
          });
        }
        await addFavorite(db, result.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCheckedIds((prev) => new Set(prev).add(result.id));
      } catch {
        // Save basic data on failure
        try {
          await upsertProduct(db, {
            id: result.id,
            name: result.name,
            brand: result.brand,
            image_url: result.image_url,
            source: "openfoodfacts",
            category: "side" as const,
            calories: result.calories ?? 0,
            proteins: 0,
            carbs: 0,
            fats: 0,
            fiber: null,
            sugars: null,
            saturated_fat: null,
            salt: null,
            last_quantity: 100,
          });
          await addFavorite(db, result.id);
          setCheckedIds((prev) => new Set(prev).add(result.id));
        } catch {
          // silently fail
        }
      } finally {
        setFetchingId(null);
      }
    },
    [checkedIds, db, fetchingId],
  );

  const handleValidate = useCallback(() => {
    useCheckedProductsStore.getState().setIds([...checkedIds]);
    router.back();
  }, [checkedIds, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un produit..."
          placeholderTextColor={colors.textMuted}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{
            backgroundColor: colors.card,
            color: colors.textPrimary,
            fontSize: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.separator,
          }}
        />
      </View>

      {loading && (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.textMuted} />
      )}

      {!loading && searched && results.length === 0 && (
        <Text
          style={{
            textAlign: "center",
            color: colors.textMuted,
            fontSize: 15,
            marginTop: 32,
          }}
        >
          Aucun résultat
        </Text>
      )}

      <FlashList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: checkedIds.size > 0 ? 100 : 0 }}
        renderItem={({ item }) => {
          const isChecked = checkedIds.has(item.id);
          const isFetching = fetchingId === item.id;
          return (
            <Pressable
              onPress={() => handleToggle(item)}
              disabled={isFetching}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                minHeight: 44,
                paddingVertical: 10,
                paddingHorizontal: 16,
                gap: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {/* Checkbox */}
              {isFetching ? (
                <ActivityIndicator
                  size="small"
                  color={colors.accent.calories}
                  style={{ width: 24, height: 24 }}
                />
              ) : (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isChecked
                      ? colors.accent.calories
                      : colors.separator,
                    backgroundColor: isChecked
                      ? colors.accent.calories
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isChecked && (
                    <SymbolView name="checkmark" size={14} tintColor="#fff" />
                  )}
                </View>
              )}

              {/* Name + Brand */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "500",
                    color: colors.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.brand ? (
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {item.brand}
                  </Text>
                ) : null}
              </View>

              {/* Calories */}
              {item.calories != null && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.textMuted,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {Math.round(item.calories)} kcal
                </Text>
              )}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: colors.separator,
              marginLeft: 52,
            }}
          />
        )}
      />

      {/* Validate button */}
      {checkedIds.size > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            paddingBottom: 32,
            backgroundColor: colors.background,
          }}
        >
          <Pressable
            onPress={handleValidate}
            style={({ pressed }) => ({
              backgroundColor: colors.accent.calories,
              borderRadius: 12,
              borderCurve: "continuous",
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              Valider ({checkedIds.size})
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
