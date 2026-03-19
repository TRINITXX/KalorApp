import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Image, type ImageStyle } from "expo-image";
import * as Haptics from "expo-haptics";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { useSettingsStore } from "@/stores/settings-store";
import { getProduct, updateLastQuantity } from "@/db/queries/products";
import { addEntry } from "@/db/queries/entries";
import { calculateForQuantity, getMealForTime } from "@/lib/nutrition-utils";
import { QuantityInput } from "@/components/nutrition/quantity-input";
import { MEALS } from "@/constants/meals";
import type { ProductRow } from "@/types/database";
import type { MealType, NutritionValues } from "@/types/nutrition";

function productRowToNutrition(product: ProductRow): NutritionValues {
  return {
    calories: product.calories,
    proteins: product.proteins,
    carbs: product.carbs,
    fats: product.fats,
    fiber: product.fiber,
    sugars: product.sugars,
    saturated_fat: product.saturated_fat,
    salt: product.salt,
  };
}

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ConfirmScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useThemeColors();
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    getMealForTime(new Date().getHours()),
  );

  useEffect(() => {
    if (!productId) return;

    const load = async () => {
      const p = await getProduct(db, productId);
      if (p) {
        setProduct(p);
        setQuantity(p.last_quantity);
      }
    };
    load();
  }, [db, productId]);

  const calculated = product
    ? calculateForQuantity(productRowToNutrition(product), quantity)
    : null;

  const visibleMeals = MEALS.filter((m) => enabledMeals[m.type]);

  const handleAdd = useCallback(async () => {
    if (!product || !calculated) return;

    await addEntry(db, {
      product_id: product.id,
      product_name: product.name,
      meal: selectedMeal,
      quantity,
      date: getTodayDate(),
      calories: calculated.calories,
      proteins: calculated.proteins,
      carbs: calculated.carbs,
      fats: calculated.fats,
      fiber: calculated.fiber,
      sugars: calculated.sugars,
      saturated_fat: calculated.saturated_fat,
      salt: calculated.salt,
    });

    await updateLastQuantity(db, product.id, quantity);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
  }, [calculated, db, product, quantity, router, selectedMeal]);

  if (!product) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 15 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 20 }}
    >
      {/* Product info */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={
              {
                width: 64,
                height: 64,
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
              width: 64,
              height: 64,
              borderRadius: 10,
              borderCurve: "continuous",
              backgroundColor: colors.isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 28, color: colors.textMuted }}>?</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: colors.textPrimary,
            }}
            numberOfLines={2}
          >
            {product.name}
          </Text>
          {product.brand ? (
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {product.brand}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Quantity */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 12,
          }}
        >
          Quantite
        </Text>
        <QuantityInput value={quantity} onChange={setQuantity} />
      </View>

      {/* Meal selector */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 12,
          }}
        >
          Repas
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {visibleMeals.map((meal) => {
            const isSelected = selectedMeal === meal.type;
            return (
              <Pressable
                key={meal.type}
                onPress={() => setSelectedMeal(meal.type)}
                style={({ pressed }) => ({
                  flex: 1,
                  minWidth: "40%",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderCurve: "continuous",
                  borderWidth: 1.5,
                  borderColor: isSelected
                    ? colors.accent.calories
                    : colors.separator,
                  backgroundColor: isSelected
                    ? colors.isDark
                      ? "rgba(74,222,128,0.12)"
                      : "rgba(22,163,74,0.08)"
                    : "transparent",
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected ? "600" : "500",
                    color: isSelected
                      ? colors.accent.calories
                      : colors.textPrimary,
                  }}
                >
                  {meal.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Nutrition preview */}
      {calculated && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            borderCurve: "continuous",
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 12,
            }}
          >
            Apport pour {quantity}g
          </Text>
          <View style={{ gap: 8 }}>
            <NutritionRow
              label="Calories"
              value={`${Math.round(calculated.calories)} kcal`}
              color={colors.accent.calories}
            />
            <NutritionRow
              label="Proteines"
              value={`${calculated.proteins.toFixed(1)} g`}
              color={colors.accent.proteins}
            />
            <NutritionRow
              label="Glucides"
              value={`${calculated.carbs.toFixed(1)} g`}
              color={colors.accent.carbs}
            />
            <NutritionRow
              label="Lipides"
              value={`${calculated.fats.toFixed(1)} g`}
              color={colors.accent.fats}
            />
          </View>
        </View>
      )}

      {/* Add button */}
      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => ({
          backgroundColor: colors.accent.calories,
          paddingVertical: 14,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
          marginTop: 4,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Ajouter
        </Text>
      </Pressable>
    </ScrollView>
  );
}

interface NutritionRowProps {
  label: string;
  value: string;
  color: string;
}

function NutritionRow({ label, value, color }: NutritionRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
        <Text style={{ fontSize: 14, color: "#999" }}>{label}</Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: "#fff",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
