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
import { flattenProductForDb } from "@/lib/product-utils";

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
