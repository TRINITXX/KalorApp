import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Image, type ImageStyle } from "expo-image";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  getProduct,
  updateLastQuantity,
  upsertProduct,
} from "@/db/queries/products";
import { addEntry } from "@/db/queries/entries";
import {
  isFavorite,
  addFavorite,
  removeFavorite,
  getFavoriteQuantity,
} from "@/db/queries/favorites";
import { calculateForQuantity, getMealForTime } from "@/lib/nutrition-utils";
import { productRowToNutrition, formatDateISO } from "@/lib/product-utils";
import { QuantityInput } from "@/components/nutrition/quantity-input";
import { MealSelector } from "@/components/nutrition/meal-selector";
import type { ProductRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

export default function ConfirmScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [favorite, setFavorite] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    calories: "",
    proteins: "",
    carbs: "",
    fats: "",
    fiber: "",
    sugars: "",
    saturated_fat: "",
    salt: "",
  });
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    getMealForTime(new Date().getHours()),
  );

  useFocusEffect(
    useCallback(() => {
      if (!productId) return;
      const load = async () => {
        const [p, fav, favQty] = await Promise.all([
          getProduct(db, productId),
          isFavorite(db, productId),
          getFavoriteQuantity(db, productId),
        ]);
        if (p) {
          setProduct(p);
          setQuantity(favQty ?? p.last_quantity);
          setFavorite(fav);
          setEditValues({
            calories: String(p.calories),
            proteins: String(p.proteins),
            carbs: String(p.carbs),
            fats: String(p.fats),
            fiber: p.fiber != null ? String(p.fiber) : "",
            sugars: p.sugars != null ? String(p.sugars) : "",
            saturated_fat:
              p.saturated_fat != null ? String(p.saturated_fat) : "",
            salt: p.salt != null ? String(p.salt) : "",
          });
        }
      };
      load();
    }, [db, productId]),
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!product) return;
    if (favorite) {
      await removeFavorite(db, product.id);
      setFavorite(false);
    } else {
      await addFavorite(db, product.id);
      setFavorite(true);
    }
  }, [db, favorite, product]);

  const handleSaveEdit = useCallback(async () => {
    if (!product) return;
    const parse = (v: string) => {
      const n = parseFloat(v.replace(",", "."));
      return isNaN(n) ? 0 : n;
    };
    const parseOpt = (v: string) => {
      if (v.trim() === "") return null;
      const n = parseFloat(v.replace(",", "."));
      return isNaN(n) ? null : n;
    };

    const updated: Omit<ProductRow, "created_at"> = {
      ...product,
      calories: parse(editValues.calories),
      proteins: parse(editValues.proteins),
      carbs: parse(editValues.carbs),
      fats: parse(editValues.fats),
      fiber: parseOpt(editValues.fiber),
      sugars: parseOpt(editValues.sugars),
      saturated_fat: parseOpt(editValues.saturated_fat),
      salt: parseOpt(editValues.salt),
    };
    await upsertProduct(db, updated);
    setProduct({ ...updated, created_at: product.created_at });
    setEditing(false);
  }, [db, editValues, product]);

  const calculated = product
    ? calculateForQuantity(productRowToNutrition(product), quantity)
    : null;

  const handleAdd = useCallback(async () => {
    if (!product || !calculated) return;
    try {
      await addEntry(db, {
        product_id: product.id,
        product_name: product.name,
        meal: selectedMeal,
        quantity,
        date: formatDateISO(),
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
      router.back();
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible d'ajouter l'entrée. Veuillez réessayer.",
      );
    }
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
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
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
        <Pressable
          onPress={handleToggleFavorite}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <SymbolView
            name={favorite ? "heart.fill" : "heart"}
            size={24}
            tintColor={favorite ? colors.accent.error : colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Quantity — compact centered */}
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.textSecondary,
          }}
        >
          Quantité
        </Text>
        <QuantityInput value={quantity} onChange={setQuantity} />
      </View>

      {/* Nutrition — all values with edit toggle */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textSecondary,
            }}
          >
            Valeurs pour 100g
          </Text>
          <Pressable
            onPress={() => {
              if (editing) {
                handleSaveEdit();
              } else {
                setEditing(true);
              }
            }}
            hitSlop={8}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.accent.calories,
              }}
            >
              {editing ? "Enregistrer" : "Modifier"}
            </Text>
          </Pressable>
        </View>

        {editing ? (
          <View style={{ gap: 10 }}>
            <EditRow
              label="Calories"
              unit="kcal"
              value={editValues.calories}
              onChange={(v) => setEditValues((p) => ({ ...p, calories: v }))}
              colors={colors}
            />
            <EditRow
              label="Protéines"
              unit="g"
              value={editValues.proteins}
              onChange={(v) => setEditValues((p) => ({ ...p, proteins: v }))}
              colors={colors}
            />
            <EditRow
              label="Glucides"
              unit="g"
              value={editValues.carbs}
              onChange={(v) => setEditValues((p) => ({ ...p, carbs: v }))}
              colors={colors}
            />
            <EditRow
              label="Lipides"
              unit="g"
              value={editValues.fats}
              onChange={(v) => setEditValues((p) => ({ ...p, fats: v }))}
              colors={colors}
            />
            <EditRow
              label="Fibres"
              unit="g"
              value={editValues.fiber}
              onChange={(v) => setEditValues((p) => ({ ...p, fiber: v }))}
              colors={colors}
              optional
            />
            <EditRow
              label="Sucres"
              unit="g"
              value={editValues.sugars}
              onChange={(v) => setEditValues((p) => ({ ...p, sugars: v }))}
              colors={colors}
              optional
            />
            <EditRow
              label="Graisses sat."
              unit="g"
              value={editValues.saturated_fat}
              onChange={(v) =>
                setEditValues((p) => ({ ...p, saturated_fat: v }))
              }
              colors={colors}
              optional
            />
            <EditRow
              label="Sel"
              unit="g"
              value={editValues.salt}
              onChange={(v) => setEditValues((p) => ({ ...p, salt: v }))}
              colors={colors}
              optional
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <NutritionRow
              label="Calories"
              value={`${Math.round(product.calories)} kcal`}
              color={colors.accent.calories}
            />
            <NutritionRow
              label="Protéines"
              value={`${product.proteins.toFixed(1)} g`}
              color={colors.accent.proteins}
            />
            <NutritionRow
              label="Glucides"
              value={`${product.carbs.toFixed(1)} g`}
              color={colors.accent.carbs}
            />
            <NutritionRow
              label="Lipides"
              value={`${product.fats.toFixed(1)} g`}
              color={colors.accent.fats}
            />
            {product.fiber != null && (
              <NutritionRow
                label="Fibres"
                value={`${product.fiber.toFixed(1)} g`}
                color={colors.textMuted}
              />
            )}
            {product.sugars != null && (
              <NutritionRow
                label="Sucres"
                value={`${product.sugars.toFixed(1)} g`}
                color={colors.textMuted}
              />
            )}
            {product.saturated_fat != null && (
              <NutritionRow
                label="Graisses sat."
                value={`${product.saturated_fat.toFixed(1)} g`}
                color={colors.textMuted}
              />
            )}
            {product.salt != null && (
              <NutritionRow
                label="Sel"
                value={`${product.salt.toFixed(1)} g`}
                color={colors.textMuted}
              />
            )}
          </View>
        )}
      </View>

      {/* Meal selector — centered, just above button */}
      <View style={{ alignItems: "center" }}>
        <MealSelector value={selectedMeal} onChange={setSelectedMeal} wrap />
      </View>

      {/* Add button */}
      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => ({
          backgroundColor: colors.accent.calories,
          paddingVertical: 14,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
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
        selectable
        style={{
          fontSize: 14,
          fontWeight: "600",
          color,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

interface EditRowProps {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useThemeColors>;
  optional?: boolean;
}

function EditRow({
  label,
  unit,
  value,
  onChange,
  colors,
  optional,
}: EditRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1 }}>
        {label}
        {optional ? " (opt.)" : ""}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholder={optional ? "—" : "0"}
          placeholderTextColor={colors.textMuted}
          style={{
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: "600",
            textAlign: "right",
            minWidth: 50,
            paddingVertical: 4,
            paddingHorizontal: 8,
            backgroundColor: colors.isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
            borderRadius: 6,
            fontVariant: ["tabular-nums"],
          }}
        />
        <Text style={{ fontSize: 13, color: colors.textMuted, minWidth: 28 }}>
          {unit}
        </Text>
      </View>
    </View>
  );
}
