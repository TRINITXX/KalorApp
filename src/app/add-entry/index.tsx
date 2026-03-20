import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Image, type ImageStyle } from "expo-image";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getFavorites } from "@/db/queries/favorites";
import { addEntry } from "@/db/queries/entries";
import { updateLastQuantity } from "@/db/queries/products";
import { calculateForQuantity, getMealForTime } from "@/lib/nutrition-utils";
import { productRowToNutrition, formatDateISO } from "@/lib/product-utils";
import { QuantityInput } from "@/components/nutrition/quantity-input";
import type { FavoriteWithProduct } from "@/db/queries/favorites";

type Step = "select" | "recap";

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
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.card,
        borderRadius: 14,
        borderCurve: "continuous",
        paddingVertical: 16,
        gap: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SymbolView
        name={icon as never}
        size={24}
        tintColor={colors.accent.calories}
      />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.textPrimary,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AddEntryScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();

  const [step, setStep] = useState<Step>("select");
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadFavorites = useCallback(async () => {
    const data = await getFavorites(db);
    setFavorites(data);
    const initialQuantities: Record<string, number> = {};
    for (const fav of data) {
      initialQuantities[fav.id] =
        (fav.favorite_quantity ?? fav.last_quantity) || 100;
    }
    setQuantities(initialQuantities);
  }, [db]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedItems = useMemo(
    () =>
      favorites
        .filter((f) => selectedIds.has(f.id))
        .map((f) => ({ product: f, quantity: quantities[f.id] || 100 })),
    [favorites, selectedIds, quantities],
  );

  const totalCalories = useMemo(
    () =>
      selectedItems.reduce((sum, item) => {
        const n = calculateForQuantity(
          productRowToNutrition(item.product),
          item.quantity,
        );
        return sum + Math.round(n.calories);
      }, 0),
    [selectedItems],
  );

  const handleSubmit = useCallback(async () => {
    if (submitting || selectedItems.length === 0) return;
    setSubmitting(true);
    try {
      const meal = getMealForTime(new Date().getHours());
      const date = formatDateISO();
      await db.withTransactionAsync(async () => {
        for (const item of selectedItems) {
          const n = calculateForQuantity(
            productRowToNutrition(item.product),
            item.quantity,
          );
          await addEntry(db, {
            product_id: item.product.id,
            product_name: item.product.name,
            meal,
            quantity: item.quantity,
            date,
            calories: Math.round(n.calories),
            proteins: Math.round(n.proteins * 10) / 10,
            carbs: Math.round(n.carbs * 10) / 10,
            fats: Math.round(n.fats * 10) / 10,
            fiber: n.fiber !== null ? Math.round(n.fiber * 10) / 10 : null,
            sugars: n.sugars !== null ? Math.round(n.sugars * 10) / 10 : null,
            saturated_fat:
              n.saturated_fat !== null
                ? Math.round(n.saturated_fat * 10) / 10
                : null,
            salt: n.salt !== null ? Math.round(n.salt * 10) / 10 : null,
          });
          await updateLastQuantity(db, item.product.id, item.quantity);
        }
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch {
      setSubmitting(false);
    }
  }, [db, router, selectedItems, submitting]);

  // ── Recap step ──
  if (step === "recap") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 160 }}
        >
          {selectedItems.map((item) => {
            const n = calculateForQuantity(
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <QuantityInput
                    value={item.quantity}
                    onChange={(v) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.product.id]: v,
                      }))
                    }
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: colors.accent.calories,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {Math.round(n.calories)} kcal
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                Ajouter tout
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Select step (default) ──
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
      >
        {/* 4x1 action buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <ActionButton
            icon="barcode.viewfinder"
            label="Scanner"
            onPress={() => router.push("/add-entry/scan")}
            colors={colors}
          />
          <ActionButton
            icon="magnifyingglass"
            label="Rechercher"
            onPress={() => router.push("/add-entry/search")}
            colors={colors}
          />
          <ActionButton
            icon="square.and.pencil"
            label="Manuel"
            onPress={() => router.push("/add-entry/manual")}
            colors={colors}
          />
        </View>

        {/* Favorites with checkboxes */}
        {favorites.length > 0 && (
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textSecondary,
              marginTop: 8,
              paddingHorizontal: 4,
            }}
          >
            Favoris
          </Text>
        )}

        {favorites.map((fav) => {
          const isSelected = selectedIds.has(fav.id);
          const qty = quantities[fav.id] || 100;
          const cal = Math.round((fav.calories * qty) / 100);
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
                padding: 12,
                gap: 12,
                borderWidth: isSelected ? 1.5 : 0,
                borderColor: isSelected
                  ? colors.accent.calories
                  : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {/* Checkbox */}
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: isSelected
                    ? colors.accent.calories
                    : colors.separator,
                  backgroundColor: isSelected
                    ? colors.accent.calories
                    : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected && (
                  <SymbolView name="checkmark" size={14} tintColor="#fff" />
                )}
              </View>

              {/* Image */}
              {fav.image_url ? (
                <Image
                  source={{ uri: fav.image_url }}
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
                    backgroundColor: colors.isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>
                    ?
                  </Text>
                </View>
              )}

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "500",
                    color: colors.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {fav.name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textMuted,
                    marginTop: 2,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {cal} kcal · {qty}g
                </Text>
              </View>
            </Pressable>
          );
        })}

        {favorites.length === 0 && (
          <Text
            style={{
              textAlign: "center",
              color: colors.textMuted,
              fontSize: 15,
              marginTop: 32,
            }}
          >
            Aucun favori. Ajoutez des produits en favoris pour les voir ici.
          </Text>
        )}
      </ScrollView>

      {/* Bottom button */}
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
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              Suivant ({selectedIds.size})
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
