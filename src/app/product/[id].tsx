import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, type ImageStyle } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getProduct, upsertProduct } from "@/db/queries/products";
import {
  isFavorite,
  addFavorite,
  removeFavorite,
  getFavoriteQuantity,
  updateFavoriteQuantity,
} from "@/db/queries/favorites";
import { NumericField, parseNumericInput } from "@/components/nutrition/numeric-field";
import { QuantityInput } from "@/components/nutrition/quantity-input";
import type { ProductRow } from "@/types/database";

// ─── Edit form schema ────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  brand: z.string().optional(),
  calories: z.number().min(0),
  proteins: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  fiber: z.number().min(0).nullable().optional(),
  sugars: z.number().min(0).nullable().optional(),
  saturated_fat: z.number().min(0).nullable().optional(),
  salt: z.number().min(0).nullable().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNutrientValue(value: number | null | undefined, unit: string): string {
  if (value == null) return `— ${unit}`;
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

function formatNutrient(per100g: number, showPer100g: boolean, quantity: number): string {
  const value = showPer100g ? per100g : per100g * quantity / 100;
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface NutrientRowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
  isLast?: boolean;
}

function NutrientRow({ label, value, colors, isLast }: NutrientRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.separator,
      }}
    >
      <Text style={{ fontSize: 15, color: colors.textPrimary }}>{label}</Text>
      <Text
        selectable
        style={{
          fontSize: 15,
          fontWeight: "500",
          color: colors.textSecondary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [favQuantity, setFavQuantity] = useState(100);
  const [showPer100g, setShowPer100g] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      brand: "",
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      fiber: null,
      sugars: null,
      saturated_fat: null,
      salt: null,
    },
  });

  // Load product and favorite status
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [p, fav, favQty] = await Promise.all([
        getProduct(db, id),
        isFavorite(db, id),
        getFavoriteQuantity(db, id),
      ]);
      if (p) {
        setProduct(p);
        setFavorite(fav);
        setFavQuantity(favQty ?? p.last_quantity);
      }
    };
    load();
  }, [db, id]);

  // Sync form values when product loads
  useEffect(() => {
    if (!product) return;
    reset({
      name: product.name,
      brand: product.brand ?? "",
      calories: product.calories,
      proteins: product.proteins,
      carbs: product.carbs,
      fats: product.fats,
      fiber: product.fiber,
      sugars: product.sugars,
      saturated_fat: product.saturated_fat,
      salt: product.salt,
    });
  }, [product, reset]);

  const handleToggleFavorite = useCallback(async () => {
    if (!product) return;
    try {
      if (favorite) {
        await removeFavorite(db, product.id);
        setFavorite(false);
      } else {
        await addFavorite(db, product.id);
        setFavorite(true);
      }
    } catch {
      Alert.alert("Erreur", "Impossible de modifier les favoris. Veuillez reessayer.");
    }
  }, [db, favorite, product]);

  const onSave = useCallback(
    async (values: EditFormValues) => {
      if (!product) return;
      setSaving(true);
      try {
        const updated: Omit<ProductRow, "created_at"> = {
          id: product.id,
          name: values.name,
          brand: values.brand?.trim() || null,
          image_url: product.image_url,
          source: product.source,
          calories: values.calories,
          proteins: values.proteins,
          carbs: values.carbs,
          fats: values.fats,
          fiber: values.fiber ?? null,
          sugars: values.sugars ?? null,
          saturated_fat: values.saturated_fat ?? null,
          salt: values.salt ?? null,
          last_quantity: product.last_quantity,
        };
        await upsertProduct(db, updated);
        setProduct({ ...updated, created_at: product.created_at });
        setIsEditing(false);
      } finally {
        setSaving(false);
      }
    },
    [db, product],
  );

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

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Name */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Nom du produit
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Ex: Yaourt nature"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  style={{
                    backgroundColor: colors.card,
                    color: colors.textPrimary,
                    fontSize: 15,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: errors.name
                      ? colors.accent.error
                      : colors.separator,
                  }}
                />
              )}
            />
            {errors.name ? (
              <Text style={{ fontSize: 12, color: colors.accent.error }}>
                {errors.name.message}
              </Text>
            ) : null}
          </View>

          {/* Brand */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Marque (optionnel)
            </Text>
            <Controller
              control={control}
              name="brand"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value ?? ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Ex: Danone"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.card,
                    color: colors.textPrimary,
                    fontSize: 15,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.separator,
                  }}
                />
              )}
            />
          </View>

          {/* Nutrition header */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            Valeurs nutritionnelles (pour 100g)
          </Text>

          {/* Required nutrients */}
          <Controller
            control={control}
            name="calories"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Calories (kcal)"
                value={value === 0 ? "" : String(value)}
                onChangeText={(text) => {
                  const num = parseNumericInput(text);
                  onChange(num ?? 0);
                }}
                onBlur={onBlur}
                colors={colors}
                error={errors.calories?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="proteins"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Proteines (g)"
                value={value === 0 ? "" : String(value)}
                onChangeText={(text) => {
                  const num = parseNumericInput(text);
                  onChange(num ?? 0);
                }}
                onBlur={onBlur}
                colors={colors}
                error={errors.proteins?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="carbs"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Glucides (g)"
                value={value === 0 ? "" : String(value)}
                onChangeText={(text) => {
                  const num = parseNumericInput(text);
                  onChange(num ?? 0);
                }}
                onBlur={onBlur}
                colors={colors}
                error={errors.carbs?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="fats"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Lipides (g)"
                value={value === 0 ? "" : String(value)}
                onChangeText={(text) => {
                  const num = parseNumericInput(text);
                  onChange(num ?? 0);
                }}
                onBlur={onBlur}
                colors={colors}
                error={errors.fats?.message}
              />
            )}
          />

          {/* Optional nutrients */}
          <Controller
            control={control}
            name="fiber"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Fibres (g)"
                value={value == null ? "" : String(value)}
                onChangeText={(text) => {
                  onChange(parseNumericInput(text));
                }}
                onBlur={onBlur}
                colors={colors}
                optional
                error={errors.fiber?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="sugars"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Sucres (g)"
                value={value == null ? "" : String(value)}
                onChangeText={(text) => {
                  onChange(parseNumericInput(text));
                }}
                onBlur={onBlur}
                colors={colors}
                optional
                error={errors.sugars?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="saturated_fat"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Graisses saturees (g)"
                value={value == null ? "" : String(value)}
                onChangeText={(text) => {
                  onChange(parseNumericInput(text));
                }}
                onBlur={onBlur}
                colors={colors}
                optional
                error={errors.saturated_fat?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="salt"
            render={({ field: { onChange, onBlur, value } }) => (
              <NumericField
                label="Sel (g)"
                value={value == null ? "" : String(value)}
                onChangeText={(text) => {
                  onChange(parseNumericInput(text));
                }}
                onBlur={onBlur}
                colors={colors}
                optional
                error={errors.salt?.message}
              />
            )}
          />

          {/* Save / Cancel buttons */}
          <Pressable
            onPress={handleSubmit(onSave)}
            disabled={saving}
            style={({ pressed }) => ({
              backgroundColor: colors.accent.calories,
              paddingVertical: 14,
              borderRadius: 12,
              borderCurve: "continuous",
              alignItems: "center",
              marginTop: 8,
              opacity: pressed || saving ? 0.7 : 1,
            })}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIsEditing(false)}
            style={({ pressed }) => ({
              paddingVertical: 14,
              borderRadius: 12,
              borderCurve: "continuous",
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              Annuler
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Product image */}
      <View style={{ alignItems: "center", marginTop: 8 }}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={
              {
                width: 180,
                height: 180,
                borderRadius: 20,
                borderCurve: "continuous",
              } as unknown as ImageStyle
            }
            contentFit="contain"
            transition={300}
          />
        ) : (
          <View
            style={{
              width: 180,
              height: 180,
              borderRadius: 20,
              borderCurve: "continuous",
              backgroundColor: colors.isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 64, color: colors.textMuted }}>?</Text>
          </View>
        )}
      </View>

      {/* Name + Brand */}
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: colors.textPrimary,
            textAlign: "center",
          }}
        >
          {product.name}
        </Text>
        {product.brand ? (
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {product.brand}
          </Text>
        ) : null}
      </View>

      {/* Favorite toggle */}
      <View style={{ alignItems: "center" }}>
        <Pressable
          onPress={handleToggleFavorite}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 12,
            borderCurve: "continuous",
            backgroundColor: favorite
              ? colors.isDark
                ? "rgba(248,113,113,0.15)"
                : "rgba(220,38,38,0.08)"
              : colors.isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SymbolView
            name={favorite ? "heart.fill" : "heart"}
            size={20}
            tintColor={favorite ? colors.accent.error : colors.textSecondary}
          />
          <Text
            style={{
              fontSize: 15,
              fontWeight: "500",
              color: favorite ? colors.accent.error : colors.textSecondary,
            }}
          >
            {favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          </Text>
        </Pressable>
      </View>

      {/* Quantity + nutritional table */}
      {favorite && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderCurve: "continuous",
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "500",
              color: colors.textSecondary,
            }}
          >
            Quantite favori
          </Text>
          <QuantityInput
            value={favQuantity}
            onChange={(v) => {
              setFavQuantity(v);
              updateFavoriteQuantity(db, product.id, v);
            }}
          />
        </View>
      )}

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderCurve: "continuous",
          paddingHorizontal: 16,
          overflow: "hidden",
        }}
      >
        {/* Toggle 100g / quantity */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 0,
            paddingTop: 14,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => setShowPer100g(true)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: showPer100g
                ? colors.accent.calories
                : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: showPer100g ? "600" : "400",
                color: showPer100g ? "#fff" : colors.textMuted,
              }}
            >
              100g
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowPer100g(false)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: !showPer100g
                ? colors.accent.calories
                : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: !showPer100g ? "600" : "400",
                color: !showPer100g ? "#fff" : colors.textMuted,
              }}
            >
              {favQuantity}g
            </Text>
          </Pressable>
        </View>

        <NutrientRow
          label="Calories"
          value={`${formatNutrient(product.calories, showPer100g, favQuantity)} kcal`}
          colors={colors}
        />
        <NutrientRow
          label="Proteines"
          value={`${formatNutrient(product.proteins, showPer100g, favQuantity)} g`}
          colors={colors}
        />
        <NutrientRow
          label="Glucides"
          value={`${formatNutrient(product.carbs, showPer100g, favQuantity)} g`}
          colors={colors}
        />
        <NutrientRow
          label="Lipides"
          value={`${formatNutrient(product.fats, showPer100g, favQuantity)} g`}
          colors={colors}
        />
        <NutrientRow
          label="Fibres"
          value={formatNutrientValue(product.fiber != null ? (showPer100g ? product.fiber : product.fiber * favQuantity / 100) : null, "g")}
          colors={colors}
        />
        <NutrientRow
          label="Sucres"
          value={formatNutrientValue(product.sugars != null ? (showPer100g ? product.sugars : product.sugars * favQuantity / 100) : null, "g")}
          colors={colors}
        />
        <NutrientRow
          label="Graisses saturees"
          value={formatNutrientValue(product.saturated_fat != null ? (showPer100g ? product.saturated_fat : product.saturated_fat * favQuantity / 100) : null, "g")}
          colors={colors}
        />
        <NutrientRow
          label="Sel"
          value={formatNutrientValue(product.salt != null ? (showPer100g ? product.salt : product.salt * favQuantity / 100) : null, "g")}
          colors={colors}
          isLast
        />
      </View>

      {/* Modifier button — only for manual products */}
      {product.source === "manual" ? (
        <Pressable
          onPress={() => setIsEditing(true)}
          style={({ pressed }) => ({
            backgroundColor: colors.card,
            paddingVertical: 14,
            borderRadius: 12,
            borderCurve: "continuous",
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.separator,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 16,
              fontWeight: "500",
            }}
          >
            Modifier
          </Text>
        </Pressable>
      ) : null}

      {/* Add entry button */}
      <Pressable
        onPress={() => router.push(`/add-entry/confirm?productId=${id}`)}
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
          Ajouter une entree
        </Text>
      </Pressable>
    </ScrollView>
  );
}
