import { useCallback } from "react";
import { ScrollView, Text, TextInput, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { upsertProduct } from "@/db/queries/products";
import {
  NumericField,
  parseNumericInput,
} from "@/components/nutrition/numeric-field";
import type { ProductRow } from "@/types/database";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  calories: z.number().min(0),
  proteins: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
  fiber: z.number().min(0).nullable().optional(),
  sugars: z.number().min(0).nullable().optional(),
  saturated_fat: z.number().min(0).nullable().optional(),
  salt: z.number().min(0).nullable().optional(),
});

type ManualFormValues = z.infer<typeof schema>;

export default function ManualScreen() {
  const { ean } = useLocalSearchParams<{ ean?: string }>();
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ManualFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
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

  const onSubmit = useCallback(
    async (values: ManualFormValues) => {
      const productId = ean ?? uuidv4();
      const product: Omit<ProductRow, "created_at"> = {
        id: productId,
        name: values.name,
        brand: null,
        image_url: null,
        source: "manual",
        calories: values.calories,
        proteins: values.proteins,
        carbs: values.carbs,
        fats: values.fats,
        fiber: values.fiber ?? null,
        sugars: values.sugars ?? null,
        saturated_fat: values.saturated_fat ?? null,
        salt: values.salt ?? null,
        last_quantity: 100,
      };

      await upsertProduct(db, product);
      router.replace(`/add-entry/confirm?productId=${productId}`);
    },
    [db, ean, router],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {/* Name field */}
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

      {/* Required nutrition fields */}
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

      {/* Optional nutrition fields */}
      <Controller
        control={control}
        name="fiber"
        render={({ field: { onChange, onBlur, value } }) => (
          <NumericField
            label="Fibres (g)"
            value={value == null ? "" : String(value)}
            onChangeText={(text) => {
              const num = parseNumericInput(text);
              onChange(num);
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
              const num = parseNumericInput(text);
              onChange(num);
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
            label="Graisses saturées (g)"
            value={value == null ? "" : String(value)}
            onChangeText={(text) => {
              const num = parseNumericInput(text);
              onChange(num);
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
              const num = parseNumericInput(text);
              onChange(num);
            }}
            onBlur={onBlur}
            colors={colors}
            optional
            error={errors.salt?.message}
          />
        )}
      />

      {/* Submit */}
      <Pressable
        onPress={handleSubmit(onSubmit)}
        style={({ pressed }) => ({
          backgroundColor: colors.accent.calories,
          paddingVertical: 14,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
          marginTop: 8,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Valider
        </Text>
      </Pressable>
    </ScrollView>
  );
}
