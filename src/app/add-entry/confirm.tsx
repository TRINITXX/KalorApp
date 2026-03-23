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
import { addEntry, updateEntry } from "@/db/queries/entries";
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
import { CategorySelector } from "@/components/nutrition/category-selector";
import type { ProductCategory, ProductRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

export default function ConfirmScreen() {
  const { productId, entryId, entryQuantity } = useLocalSearchParams<{
    productId: string;
    entryId?: string;
    entryQuantity?: string;
  }>();
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [favorite, setFavorite] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("side");
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
          setEditedName(p.name);
          setCategory(p.category);
          setQuantity(
            entryQuantity
              ? parseInt(entryQuantity, 10)
              : (favQty ?? p.last_quantity),
          );
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

  const handleSaveName = useCallback(async () => {
    if (!product) return;
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== product.name) {
      const updated = { ...product, name: trimmed };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { created_at, ...rest } = updated;
      await upsertProduct(db, rest);
      setProduct(updated);
    }
    setEditingName(false);
  }, [db, editedName, product]);

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
    if (!product) return;

    // Auto-save edits if still in editing mode
    let currentProduct = product;
    if (editing) {
      const parse = (v: string) => {
        const n = parseFloat(v.replace(",", "."));
        return isNaN(n) ? 0 : n;
      };
      const parseOpt = (v: string) => {
        if (v.trim() === "") return null;
        const n = parseFloat(v.replace(",", "."));
        return isNaN(n) ? null : n;
      };
      currentProduct = {
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
      await upsertProduct(db, currentProduct);
      setProduct(currentProduct);
      setEditing(false);
    }

    if (category !== currentProduct.category) {
      currentProduct = { ...currentProduct, category };
      const { created_at: _ca, ...rest } = currentProduct;
      await upsertProduct(db, rest);
      setProduct(currentProduct);
    }

    const calc = calculateForQuantity(
      productRowToNutrition(currentProduct),
      quantity,
    );

    try {
      const nutritionData = {
        meal: selectedMeal,
        quantity,
        calories: calc.calories,
        proteins: calc.proteins,
        carbs: calc.carbs,
        fats: calc.fats,
        fiber: calc.fiber,
        sugars: calc.sugars,
        saturated_fat: calc.saturated_fat,
        salt: calc.salt,
      };

      if (entryId) {
        await updateEntry(db, parseInt(entryId, 10), nutritionData);
      } else {
        await addEntry(db, {
          product_id: currentProduct.id,
          product_name: currentProduct.name,
          date: formatDateISO(),
          ...nutritionData,
        });
      }
      await updateLastQuantity(db, currentProduct.id, quantity);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible d'ajouter l'entrée. Veuillez réessayer.",
      );
    }
  }, [
    category,
    db,
    editing,
    editValues,
    entryId,
    product,
    quantity,
    router,
    selectedMeal,
  ]);

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
          {editingName ? (
            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              autoFocus
              returnKeyType="done"
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: colors.textPrimary,
                paddingVertical: 2,
                paddingHorizontal: 6,
                marginHorizontal: -6,
                backgroundColor: colors.isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.04)",
                borderRadius: 6,
              }}
            />
          ) : (
            <Pressable
              onPress={() => setEditingName(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: colors.textPrimary,
                  flex: 1,
                }}
                numberOfLines={2}
              >
                {product.name}
              </Text>
              <SymbolView
                name="pencil"
                size={14}
                tintColor={colors.textMuted}
              />
            </Pressable>
          )}
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

      {/* Category */}
      <CategorySelector value={category} onChange={setCategory} />

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
            Valeurs pour {quantity}g
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
              label="Lipides"
              unit="g"
              value={editValues.fats}
              onChange={(v) => setEditValues((p) => ({ ...p, fats: v }))}
              colors={colors}
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
              label="Glucides"
              unit="g"
              value={editValues.carbs}
              onChange={(v) => setEditValues((p) => ({ ...p, carbs: v }))}
              colors={colors}
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
              label="Fibres"
              unit="g"
              value={editValues.fiber}
              onChange={(v) => setEditValues((p) => ({ ...p, fiber: v }))}
              colors={colors}
              optional
            />
            <EditRow
              label="Protéines"
              unit="g"
              value={editValues.proteins}
              onChange={(v) => setEditValues((p) => ({ ...p, proteins: v }))}
              colors={colors}
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
              value={`${Math.round(calculated?.calories ?? 0)} kcal`}
              color={colors.accent.calories}
            />
            <NutritionRow
              label="Lipides"
              value={`${(calculated?.fats ?? 0).toFixed(1)} g`}
              color={colors.accent.fats}
            />
            {calculated?.saturated_fat != null && (
              <NutritionRow
                label="Graisses sat."
                value={`${calculated.saturated_fat.toFixed(1)} g`}
                color={colors.textMuted}
              />
            )}
            <NutritionRow
              label="Glucides"
              value={`${(calculated?.carbs ?? 0).toFixed(1)} g`}
              color={colors.accent.carbs}
            />
            {calculated?.sugars != null && (
              <NutritionRow
                label="Sucres"
                value={`${calculated.sugars.toFixed(1)} g`}
                color={colors.textMuted}
              />
            )}
            {calculated?.fiber != null && (
              <NutritionRow
                label="Fibres"
                value={`${calculated.fiber.toFixed(1)} g`}
                color={colors.textMuted}
              />
            )}
            <NutritionRow
              label="Protéines"
              value={`${(calculated?.proteins ?? 0).toFixed(1)} g`}
              color={colors.accent.proteins}
            />
            {calculated?.salt != null && (
              <NutritionRow
                label="Sel"
                value={`${calculated.salt.toFixed(1)} g`}
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
          {entryId ? "Modifier" : "Ajouter"}
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
