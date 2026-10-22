import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDb } from "@/app/_layout";
import {
  NutritionTable,
  nutrientTexts,
  parseNutrientTexts,
  type NutrientKey,
  type NutrientTexts,
} from "@/components/nutrition/nutrition-table";
import { QuantityStepper } from "@/components/nutrition/quantity-stepper";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ProductThumb } from "@/components/ui/product-thumb";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MEALS } from "@/constants/meals";
import { deleteEntry, getEntry, updateEntry } from "@/db/queries/entries";
import {
  addFavorite,
  getFavoriteQuantity,
  isFavorite,
  removeFavorite,
} from "@/db/queries/favorites";
import { getProduct, updateLastQuantity, upsertProduct } from "@/db/queries/products";
import { useThemeColors, type ThemeColors } from "@/hooks/use-theme-colors";
import { entryNutrition, entryPer100g, formatNumber } from "@/lib/nutrition-utils";
import { productRowToNutrition } from "@/lib/product-utils";
import { useSettingsStore } from "@/stores/settings-store";
import type { EntryRow, ProductRow } from "@/types/database";
import type { MealType, NutritionValues } from "@/types/nutrition";

/** Edits one food already in the journal: quantity, meal, values, or removal. */
export default function EditEntryScreen() {
  const { productId, entryId } = useLocalSearchParams<{ productId: string; entryId: string }>();
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);

  const [entry, setEntry] = useState<EntryRow | null>(null);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [portion, setPortion] = useState(100);
  const [meal, setMeal] = useState<MealType>("lunch");
  const [favorite, setFavorite] = useState(false);
  // Table shown per 100 g (to type corrections) or for the eaten quantity.
  const [showPer100g, setShowPer100g] = useState(false);
  // Corrections typed per 100 g; kept when switching back to the portion view.
  const [values, setValues] = useState<NutrientTexts | null>(null);
  const [valuesEdited, setValuesEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [e, p, fav, favQty] = await Promise.all([
        getEntry(db, Number(entryId)),
        getProduct(db, productId),
        isFavorite(db, productId),
        getFavoriteQuantity(db, productId),
      ]);
      if (!e || !p) return;
      setEntry(e);
      setProduct(p);
      setQuantity(e.quantity);
      setMeal(e.meal);
      setFavorite(fav);
      setPortion(favQty || p.last_quantity || 100);
      setValues(nutrientTexts(productRowToNutrition(p)));
    })();
  }, [db, entryId, productId]);

  // Values per 100 g: the typed corrections, else the entry's own snapshot.
  const per100g = useCallback((): NutritionValues | null => {
    if (!entry) return null;
    if (valuesEdited && values) return parseNutrientTexts(values);
    return entryPer100g(entry);
  }, [entry, values, valuesEdited]);

  const handleSave = useCallback(async () => {
    const base = per100g();
    if (!entry || !product || !base || saving) return;
    setSaving(true);
    try {
      if (valuesEdited) {
        const { created_at: _createdAt, ...row } = product;
        await upsertProduct(db, { ...row, ...base });
      }
      await updateEntry(db, entry.id, { meal, quantity, ...entryNutrition(base, quantity) });
      await updateLastQuantity(db, product.id, quantity);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("Enregistrement impossible", "La modification n'a pas été enregistrée. Réessaie.");
    }
  }, [db, entry, meal, per100g, product, quantity, router, saving, valuesEdited]);

  const handleDelete = useCallback(() => {
    if (!entry) return;
    Alert.alert("Supprimer cet aliment ?", `${entry.product_name} sera retiré du journal.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteEntry(db, entry.id);
          router.back();
        },
      },
    ]);
  }, [db, entry, router]);

  const toggleFavorite = useCallback(async () => {
    if (!product) return;
    Haptics.selectionAsync();
    if (favorite) await removeFavorite(db, product.id);
    else await addFavorite(db, product.id);
    setFavorite(!favorite);
  }, [db, favorite, product]);

  if (!product || !entry) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const base = per100g();
  const totals = base ? entryNutrition(base, quantity) : null;
  const mealOptions = MEALS.filter((m) => enabledMeals[m.type] || m.type === meal).map((m) => ({
    value: m.type,
    label: m.label,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <Card style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <ProductThumb uri={product.image_url} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ fontSize: 17, fontWeight: "600", color: colors.textPrimary }}>
              {product.name}
            </Text>
            {product.brand ? (
              <Text numberOfLines={1} style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                {product.brand}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={toggleFavorite}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <SymbolView
              name={favorite ? "heart.fill" : "heart"}
              size={24}
              tintColor={favorite ? colors.accent.error : colors.textSecondary}
            />
          </Pressable>
        </Card>

        <View style={{ gap: 8 }}>
          <Label colors={colors}>Quantité</Label>
          <QuantityStepper value={quantity} portion={portion} onChange={setQuantity} />
        </View>

        <View style={{ gap: 8 }}>
          <Label colors={colors}>Repas</Label>
          <SegmentedControl options={mealOptions} value={meal} onChange={setMeal} />
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Label colors={colors}>
              {showPer100g ? "Valeurs pour 100 g" : `Pour ${formatNumber(quantity)} g`}
            </Label>
            <Pressable onPress={() => setShowPer100g((v) => !v)} hitSlop={8}>
              <Text style={{ fontSize: 15, color: colors.accent.caloriesText }}>
                {showPer100g ? "Voir la portion" : "Corriger les valeurs"}
              </Text>
            </Pressable>
          </View>
          {showPer100g && values ? (
            <NutritionTable
              mode="edit"
              texts={values}
              onChange={(key: NutrientKey, text) => {
                setValuesEdited(true);
                setValues((prev) => (prev ? { ...prev, [key]: text } : prev));
              }}
            />
          ) : (
            totals && <NutritionTable mode="view" values={totals} />
          )}
          {(showPer100g || valuesEdited) && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginHorizontal: 4 }}>
              La correction vaut pour ce produit partout. Les jours passés ne changent pas.
            </Text>
          )}
        </View>

        <Pressable onPress={handleDelete} style={{ alignItems: "center", paddingVertical: 8 }}>
          <Text style={{ fontSize: 17, color: colors.accent.error }}>Supprimer du journal</Text>
        </Pressable>
      </ScrollView>

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
        <PrimaryButton label="Enregistrer" onPress={handleSave} loading={saving} />
      </View>
    </View>
  );
}

function Label({ children, colors }: { children: string; colors: ThemeColors }) {
  return (
    <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 4, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}
