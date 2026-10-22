import { Text, TextInput, View } from "react-native";

import { parseNumericInput } from "@/components/nutrition/numeric-field";
import { Card } from "@/components/ui/card";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatNumber } from "@/lib/nutrition-utils";
import type { NutritionValues } from "@/types/nutrition";

export type NutrientKey = keyof NutritionValues;
export type NutrientTexts = Record<NutrientKey, string>;

const NUTRIENTS: { key: NutrientKey; label: string; unit: string; optional?: boolean; sub?: boolean }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "proteins", label: "Protéines", unit: "g" },
  { key: "carbs", label: "Glucides", unit: "g" },
  { key: "sugars", label: "dont sucres", unit: "g", optional: true, sub: true },
  { key: "fats", label: "Lipides", unit: "g" },
  { key: "saturated_fat", label: "dont saturés", unit: "g", optional: true, sub: true },
  { key: "fiber", label: "Fibres", unit: "g", optional: true },
  { key: "salt", label: "Sel", unit: "g", optional: true },
];

const toText = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

export function nutrientTexts(values: NutritionValues): NutrientTexts {
  return Object.fromEntries(NUTRIENTS.map((n) => [n.key, toText(values[n.key])])) as NutrientTexts;
}

/** Typed texts back to values: a blank main nutrient is 0, a blank optional one unknown. */
export function parseNutrientTexts(texts: NutrientTexts): NutritionValues {
  const read = (key: NutrientKey) => parseNumericInput(texts[key] ?? "");
  return {
    calories: read("calories") ?? 0,
    proteins: read("proteins") ?? 0,
    carbs: read("carbs") ?? 0,
    fats: read("fats") ?? 0,
    fiber: read("fiber"),
    sugars: read("sugars"),
    saturated_fat: read("saturated_fat"),
    salt: read("salt"),
  };
}

type NutritionTableProps =
  | { mode: "view"; values: NutritionValues }
  | { mode: "edit"; texts: NutrientTexts; onChange: (key: NutrientKey, text: string) => void };

/** Calories, macros and micros, either shown or typed (per 100 g). */
export function NutritionTable(props: NutritionTableProps) {
  const colors = useThemeColors();
  return (
    <Card>
      {NUTRIENTS.map((n, i) => (
        <View
          key={n.key}
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: 44,
            paddingHorizontal: 16,
            borderTopWidth: i === 0 ? 0 : 0.5,
            borderTopColor: colors.separator,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              color: n.sub ? colors.textSecondary : colors.textPrimary,
              paddingLeft: n.sub ? 12 : 0,
            }}
          >
            {n.label}
          </Text>
          {props.mode === "edit" ? (
            <TextInput
              defaultValue={props.texts[n.key]}
              onChangeText={(t) => props.onChange(n.key, t)}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholder={n.optional ? "–" : "0"}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={`${n.label} pour 100 grammes`}
              style={{
                minWidth: 70,
                textAlign: "right",
                fontSize: 16,
                paddingVertical: 8,
                color: colors.accent.caloriesText,
                fontVariant: ["tabular-nums"],
              }}
            />
          ) : (
            <Text style={{ fontSize: 16, color: colors.textPrimary, fontVariant: ["tabular-nums"] }}>
              {props.values[n.key] != null
                ? formatNumber(props.values[n.key] as number, n.key === "calories" ? 0 : 1)
                : "–"}
            </Text>
          )}
          <Text style={{ width: 38, textAlign: "right", fontSize: 15, color: colors.textSecondary }}>
            {n.unit}
          </Text>
        </View>
      ))}
    </Card>
  );
}
