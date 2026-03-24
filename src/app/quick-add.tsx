import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getFavorites } from "@/db/queries/favorites";
import type { FavoriteWithProduct } from "@/db/queries/favorites";
import { addEntry } from "@/db/queries/entries";
import { updateLastQuantity } from "@/db/queries/products";
import { calculateForQuantity, getMealForTime } from "@/lib/nutrition-utils";
import { productRowToNutrition, formatDateISO } from "@/lib/product-utils";
import { MealSelector } from "@/components/nutrition/meal-selector";
import type { MealType } from "@/types/nutrition";

interface SelectionState {
  selected: boolean;
  quantity: number;
}

export default function QuickAddScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();

  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [selections, setSelections] = useState<Record<string, SelectionState>>(
    {},
  );
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    getMealForTime(new Date().getHours()),
  );
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const load = async () => {
      const favs = await getFavorites(db);
      setFavorites(favs);
      const initial: Record<string, SelectionState> = {};
      for (const fav of favs) {
        initial[fav.id] = {
          selected: false,
          quantity: (fav.favorite_quantity ?? fav.last_quantity) || 100,
        };
      }
      setSelections(initial);
    };
    load();
  }, [db]);

  const toggleSelection = useCallback((productId: string) => {
    setSelections((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selected: !prev[productId]?.selected,
      },
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, value: string) => {
    const parsed = parseFloat(value);
    const quantity = isNaN(parsed) || parsed <= 0 ? 0 : parsed;
    setSelections((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity,
      },
    }));
  }, []);

  const selectedCount = Object.values(selections).filter(
    (s) => s.selected,
  ).length;

  const handleConfirm = useCallback(async () => {
    if (selectedCount === 0 || isAdding) return;
    setIsAdding(true);

    try {
      const today = formatDateISO();
      await db.withTransactionAsync(async () => {
        for (const fav of favorites) {
          const sel = selections[fav.id];
          if (!sel?.selected || sel.quantity <= 0) continue;

          const per100g = productRowToNutrition(fav);
          const calculated = calculateForQuantity(per100g, sel.quantity);

          await addEntry(db, {
            product_id: fav.id,
            product_name: fav.name,
            meal: selectedMeal,
            quantity: sel.quantity,
            date: today,
            calories: calculated.calories,
            proteins: calculated.proteins,
            carbs: calculated.carbs,
            fats: calculated.fats,
            fiber: calculated.fiber,
            sugars: calculated.sugars,
            saturated_fat: calculated.saturated_fat,
            salt: calculated.salt,
          });

          await updateLastQuantity(db, fav.id, sel.quantity);
        }
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch {
      setIsAdding(false);
    }
  }, [
    db,
    favorites,
    isAdding,
    selectedCount,
    selectedMeal,
    selections,
    router,
  ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.textPrimary,
          }}
        >
          Ajout rapide
        </Text>
        {favorites.length === 0 ? null : (
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            Selectionnez les produits a ajouter
          </Text>
        )}
      </View>

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 15,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            Aucun favori encore.{"\n"}Ajoutez des produits a vos favoris pour
            les retrouver ici.
          </Text>
        </View>
      ) : (
        <FlashList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          renderItem={({ item }) => {
            const sel = selections[item.id];
            const isSelected = sel?.selected ?? false;
            return (
              <FavoriteRow
                item={item}
                isSelected={isSelected}
                quantity={sel?.quantity ?? item.last_quantity}
                onToggle={toggleSelection}
                onQuantityChange={updateQuantity}
                colors={colors}
              />
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
      )}

      {/* Bottom: meal selector + confirm button */}
      <View
        style={{
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.separator,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Platform.OS === "ios" ? 32 : 16,
          gap: 12,
        }}
      >
        {/* Meal selector */}
        <MealSelector value={selectedMeal} onChange={setSelectedMeal} />

        {/* Confirm button */}
        <Pressable
          onPress={handleConfirm}
          disabled={selectedCount === 0 || isAdding}
          style={({ pressed }) => ({
            backgroundColor: colors.accent.calories,
            paddingVertical: 14,
            borderRadius: 12,
            borderCurve: "continuous",
            alignItems: "center",
            opacity: selectedCount === 0 || isAdding ? 0.5 : pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            {selectedCount === 0
              ? "Ajouter des produits"
              : `Ajouter ${selectedCount} produit${selectedCount > 1 ? "s" : ""}`}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

interface FavoriteRowProps {
  item: FavoriteWithProduct;
  isSelected: boolean;
  quantity: number;
  onToggle: (productId: string) => void;
  onQuantityChange: (productId: string, value: string) => void;
  colors: ReturnType<typeof useThemeColors>;
}

function FavoriteRow({
  item,
  isSelected,
  quantity,
  onToggle,
  onQuantityChange,
  colors,
}: FavoriteRowProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 4,
        backgroundColor: isSelected
          ? colors.isDark
            ? "rgba(74,222,128,0.06)"
            : "rgba(22,163,74,0.04)"
          : "transparent",
        opacity: pressed ? 0.8 : 1,
        gap: 12,
      })}
    >
      {/* Checkbox */}
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: isSelected ? 0 : 2,
          borderColor: colors.separator,
          backgroundColor: isSelected ? colors.accent.calories : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isSelected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#fff",
            }}
          />
        )}
      </View>

      {/* Product info */}
      <View style={{ flex: 1, minWidth: 0 }}>
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
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {item.brand}
          </Text>
        ) : null}
      </View>

      {/* Quantity input */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          inputRef.current?.focus();
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.04)",
          borderRadius: 8,
          borderCurve: "continuous",
          paddingHorizontal: 10,
          paddingVertical: 6,
          gap: 4,
          minWidth: 72,
        }}
      >
        <TextInput
          ref={inputRef}
          value={quantity > 0 ? String(quantity) : ""}
          onChangeText={(v) => onQuantityChange(item.id, v)}
          onFocus={() => {
            if (!isSelected) onToggle(item.id);
          }}
          keyboardType="numeric"
          returnKeyType="done"
          selectTextOnFocus
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.textPrimary,
            minWidth: 36,
            textAlign: "right",
            padding: 0,
          }}
        />
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>g</Text>
      </Pressable>
    </Pressable>
  );
}
