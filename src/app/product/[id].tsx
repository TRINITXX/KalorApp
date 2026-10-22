import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

import { useDb } from "@/app/_layout";
import { CategorySelector } from "@/components/nutrition/category-selector";
import {
  NutritionTable,
  nutrientTexts,
  parseNutrientTexts,
  type NutrientTexts,
} from "@/components/nutrition/nutrition-table";
import { QuantityInput } from "@/components/nutrition/quantity-input";
import { Card } from "@/components/ui/card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ProductThumb } from "@/components/ui/product-thumb";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  addFavorite,
  getFavoriteQuantity,
  isFavorite,
  removeFavorite,
  updateFavoriteQuantity,
} from "@/db/queries/favorites";
import { getProduct, updateLastQuantity, upsertProduct } from "@/db/queries/products";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { calculateForQuantity, formatNumber } from "@/lib/nutrition-utils";
import { productRowToNutrition } from "@/lib/product-utils";
import type { ProductCategory, ProductRow } from "@/types/database";

const SOURCE_LABELS: Record<ProductRow["source"], string> = {
  openfoodfacts: "Fiche OpenFoodFacts",
  manual: "Créé à la main",
  estimated: "Valeurs estimées par Claude, à vérifier",
};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const colors = useThemeColors();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [portion, setPortion] = useState(100);
  const [view, setView] = useState<"100g" | "portion">("100g");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [texts, setTexts] = useState<NutrientTexts | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [p, fav, favQty] = await Promise.all([
        getProduct(db, id),
        isFavorite(db, id),
        getFavoriteQuantity(db, id),
      ]);
      if (!p) return;
      setProduct(p);
      setFavorite(fav);
      setPortion(favQty || p.last_quantity || 100);
    })();
  }, [db, id]);

  const save = useCallback(
    async (next: ProductRow) => {
      const { created_at: _createdAt, ...row } = next;
      await upsertProduct(db, row);
      setProduct(next);
    },
    [db],
  );

  const toggleFavorite = useCallback(async () => {
    if (!product) return;
    Haptics.selectionAsync();
    if (favorite) await removeFavorite(db, product.id);
    else {
      await addFavorite(db, product.id);
      await updateFavoriteQuantity(db, product.id, portion);
    }
    setFavorite(!favorite);
  }, [db, favorite, portion, product]);

  const startEditing = () => {
    if (!product) return;
    setName(product.name);
    setBrand(product.brand ?? "");
    setTexts(nutrientTexts(productRowToNutrition(product)));
    setEditing(true);
  };

  const saveEditing = async () => {
    if (!product || !texts) return;
    if (name.trim() === "") {
      Alert.alert("Nom manquant", "Donne un nom au produit.");
      return;
    }
    await save({
      ...product,
      ...parseNutrientTexts(texts),
      name: name.trim(),
      brand: brand.trim() || null,
      // Values checked by hand are no longer an estimate.
      source: product.source === "estimated" ? "manual" : product.source,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  if (!product) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const per100g = productRowToNutrition(product);
  const shown = view === "100g" ? per100g : calculateForQuantity(per100g, portion);
  const inputStyle = {
    fontSize: 17,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 16,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={editing ? saveEditing : startEditing} hitSlop={10}>
              <Text style={{ fontSize: 17, fontWeight: editing ? "700" : "400", color: colors.accent.caloriesText }}>
                {editing ? "OK" : "Modifier"}
              </Text>
            </Pressable>
          ),
        }}
      />

      {editing ? (
        <Card>
          <TextInput value={name} onChangeText={setName} placeholder="Nom" placeholderTextColor={colors.textMuted} style={inputStyle} />
          <View style={{ height: 0.5, backgroundColor: colors.separator, marginLeft: 16 }} />
          <TextInput value={brand} onChangeText={setBrand} placeholder="Marque (facultatif)" placeholderTextColor={colors.textMuted} style={inputStyle} />
        </Card>
      ) : (
        <View style={{ alignItems: "center", gap: 10 }}>
          <ProductThumb uri={product.image_url} size={96} />
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.textPrimary, textAlign: "center" }}>
              {product.name}
            </Text>
            {product.brand ? (
              <Text style={{ fontSize: 15, color: colors.textSecondary }}>{product.brand}</Text>
            ) : null}
            <Text
              style={{
                fontSize: 13,
                marginTop: 4,
                color: product.source === "estimated" ? colors.accent.warning : colors.textSecondary,
              }}
            >
              {SOURCE_LABELS[product.source]}
            </Text>
          </View>
          <PressableScale
            onPress={toggleFavorite}
            accessibilityRole="button"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 9,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: colors.card,
            }}
          >
            <SymbolView
              name={favorite ? "heart.fill" : "heart"}
              size={18}
              tintColor={favorite ? colors.accent.error : colors.textSecondary}
            />
            <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textPrimary }}>
              {favorite ? "Dans tes favoris" : "Ajouter aux favoris"}
            </Text>
          </PressableScale>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <SectionLabel>Catégorie dans l'écran d'ajout</SectionLabel>
        <CategorySelector
          value={product.category}
          onChange={(category: ProductCategory) => save({ ...product, category })}
        />
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, color: colors.textPrimary }}>Portion habituelle</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
            Proposée à l'ajout et pour la dictée
          </Text>
        </View>
        <QuantityInput
          value={portion}
          onChange={(grams) => {
            setPortion(grams);
            if (favorite) updateFavoriteQuantity(db, product.id, grams);
            else updateLastQuantity(db, product.id, grams);
          }}
        />
      </Card>

      <View style={{ gap: 8 }}>
        {editing ? (
          <SectionLabel>Valeurs pour 100 g</SectionLabel>
        ) : (
          <SegmentedControl
            options={[
              { value: "100g", label: "Pour 100 g" },
              { value: "portion", label: `Pour ${formatNumber(portion)} g` },
            ]}
            value={view}
            onChange={setView}
          />
        )}
        {editing && texts ? (
          <NutritionTable
            mode="edit"
            texts={texts}
            onChange={(key, text) => setTexts((prev) => (prev ? { ...prev, [key]: text } : prev))}
          />
        ) : (
          <NutritionTable mode="view" values={shown} />
        )}
        {editing && (
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginHorizontal: 4 }}>
            Les jours déjà notés gardent leurs anciennes valeurs.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 4, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}
