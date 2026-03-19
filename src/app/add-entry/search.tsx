import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { FlashList } from "@shopify/flash-list";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { useDebounce } from "@/hooks/use-debounce";
import { searchProducts, fetchProduct } from "@/lib/open-food-facts";
import type { SearchResult } from "@/lib/open-food-facts";
import { upsertProduct } from "@/db/queries/products";
import { ProductRow } from "@/components/nutrition/product-row";
import type { ProductRow as ProductRowType } from "@/types/database";

function flattenProductForDb(product: {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  source: string;
  nutrition_per_100g: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fiber: number | null;
    sugars: number | null;
    saturated_fat: number | null;
    salt: number | null;
  };
  last_quantity: number;
}): Omit<ProductRowType, "created_at"> {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    image_url: product.image_url,
    source: product.source,
    calories: product.nutrition_per_100g.calories,
    proteins: product.nutrition_per_100g.proteins,
    carbs: product.nutrition_per_100g.carbs,
    fats: product.nutrition_per_100g.fats,
    fiber: product.nutrition_per_100g.fiber,
    sugars: product.nutrition_per_100g.sugars,
    saturated_fat: product.nutrition_per_100g.saturated_fat,
    salt: product.nutrition_per_100g.salt,
    last_quantity: product.last_quantity,
  };
}

export default function SearchScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      try {
        const fullProduct = await fetchProduct(result.id);
        if (fullProduct) {
          await upsertProduct(db, flattenProductForDb(fullProduct));
          router.push(`/add-entry/confirm?productId=${result.id}`);
        }
      } catch {
        // If fetch fails, navigate with basic data
        router.push(`/add-entry/confirm?productId=${result.id}`);
      }
    },
    [db, router],
  );

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
          Aucun resultat
        </Text>
      )}

      <FlashList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductRow
            name={item.name}
            brand={item.brand}
            imageUrl={item.image_url}
            onPress={() => handleSelect(item)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: colors.separator,
              marginLeft: 68,
            }}
          />
        )}
      />
    </View>
  );
}
