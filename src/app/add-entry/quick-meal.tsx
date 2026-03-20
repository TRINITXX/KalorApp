import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageStyle,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";

import { useDb } from "@/app/_layout";
import { QuantityInput } from "@/components/nutrition/quantity-input";
import { getFavorites } from "@/db/queries/favorites";
import { addEntry } from "@/db/queries/entries";
import { updateLastQuantity } from "@/db/queries/products";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { calculateForQuantity, getMealForTime } from "@/lib/nutrition-utils";
import { productRowToNutrition, formatDateISO } from "@/lib/product-utils";
import type { FavoriteWithProduct } from "@/db/queries/favorites";

type Step = "select" | "recap";

interface SelectedItem {
  product: FavoriteWithProduct;
  quantity: number;
}

export default function QuickMealScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();

  const [step, setStep] = useState<Step>("select");
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    const data = await getFavorites(db);
    setFavorites(data);
    // Initialize quantities with last_quantity for each product
    const initialQuantities: Record<string, number> = {};
    for (const fav of data) {
      initialQuantities[fav.id] = fav.last_quantity || 100;
    }
    setQuantities(initialQuantities);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleSelection = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const updateQuantity = (productId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  };

  const selectedItems: SelectedItem[] = favorites
    .filter((f) => selectedIds.has(f.id))
    .map((f) => ({ product: f, quantity: quantities[f.id] || 100 }));

  const totalCalories = selectedItems.reduce((sum, item) => {
    const nutrition = calculateForQuantity(
      productRowToNutrition(item.product),
      item.quantity,
    );
    return sum + Math.round(nutrition.calories);
  }, 0);

  const handleSubmit = async () => {
    if (submitting || selectedItems.length === 0) return;
    setSubmitting(true);

    try {
      const meal = getMealForTime(new Date().getHours());
      const date = formatDateISO();

      await db.withTransactionAsync(async () => {
        for (const item of selectedItems) {
          const nutrition = calculateForQuantity(
            productRowToNutrition(item.product),
            item.quantity,
          );

          await addEntry(db, {
            product_id: item.product.id,
            product_name: item.product.name,
            meal,
            quantity: item.quantity,
            date,
            calories: Math.round(nutrition.calories),
            proteins: Math.round(nutrition.proteins * 10) / 10,
            carbs: Math.round(nutrition.carbs * 10) / 10,
            fats: Math.round(nutrition.fats * 10) / 10,
            fiber:
              nutrition.fiber !== null
                ? Math.round(nutrition.fiber * 10) / 10
                : null,
            sugars:
              nutrition.sugars !== null
                ? Math.round(nutrition.sugars * 10) / 10
                : null,
            saturated_fat:
              nutrition.saturated_fat !== null
                ? Math.round(nutrition.saturated_fat * 10) / 10
                : null,
            salt:
              nutrition.salt !== null
                ? Math.round(nutrition.salt * 10) / 10
                : null,
          });

          await updateLastQuantity(db, item.product.id, item.quantity);
        }
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.accent.calories} />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          Aucun favori pour le moment. Ajoutez des produits en favoris pour
          utiliser le repas rapide.
        </Text>
      </View>
    );
  }

  if (step === "select") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 100 }}
        >
          {favorites.map((fav) => {
            const isSelected = selectedIds.has(fav.id);
            return (
              <Pressable
                key={fav.id}
                onPress={() => toggleSelection(fav.id)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  padding: 14,
                  opacity: pressed ? 0.7 : 1,
                  gap: 12,
                })}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderCurve: "continuous",
                    borderWidth: 2,
                    borderColor: isSelected
                      ? colors.accent.calories
                      : colors.separator,
                    backgroundColor: isSelected
                      ? colors.accent.calories
                      : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {isSelected && (
                    <SymbolView
                      name="checkmark"
                      size={14}
                      tintColor="#FFFFFF"
                    />
                  )}
                </View>

                {fav.image_url ? (
                  <Image
                    source={fav.image_url}
                    style={
                      {
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        borderCurve: "continuous",
                      } as unknown as ImageStyle
                    }
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      borderCurve: "continuous",
                      backgroundColor: colors.separator,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <SymbolView
                      name="fork.knife"
                      size={18}
                      tintColor={colors.textMuted}
                    />
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
                  {fav.brand && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {fav.brand}
                    </Text>
                  )}
                </View>

                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textMuted,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {fav.last_quantity || 100}g
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedIds.size > 0 && (
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
              onPress={() => setStep("recap")}
              style={({ pressed }) => ({
                backgroundColor: colors.accent.calories,
                borderRadius: 12,
                borderCurve: "continuous",
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}
              >
                Suivant ({selectedIds.size})
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // Step "recap"
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 160 }}
      >
        {selectedItems.map((item) => {
          const nutrition = calculateForQuantity(
            productRowToNutrition(item.product),
            item.quantity,
          );
          return (
            <View
              key={item.product.id}
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderCurve: "continuous",
                padding: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {item.product.image_url ? (
                  <Image
                    source={item.product.image_url}
                    style={
                      {
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        borderCurve: "continuous",
                      } as unknown as ImageStyle
                    }
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      borderCurve: "continuous",
                      backgroundColor: colors.separator,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <SymbolView
                      name="fork.knife"
                      size={18}
                      tintColor={colors.textMuted}
                    />
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
                    {item.product.name}
                  </Text>
                  {item.product.brand && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {item.product.brand}
                    </Text>
                  )}
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <QuantityInput
                  value={item.quantity}
                  onChange={(v) => updateQuantity(item.product.id, v)}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.accent.calories,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {Math.round(nutrition.calories)} kcal
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: 32,
          backgroundColor: colors.background,
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textSecondary,
            }}
          >
            Total
          </Text>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: colors.accent.calories,
              fontVariant: ["tabular-nums"],
            }}
          >
            {totalCalories} kcal
          </Text>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => ({
            backgroundColor: colors.accent.calories,
            borderRadius: 12,
            borderCurve: "continuous",
            paddingVertical: 14,
            alignItems: "center",
            opacity: pressed || submitting ? 0.7 : 1,
          })}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Ajouter tout
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
