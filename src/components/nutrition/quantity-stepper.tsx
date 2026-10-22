import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";

import { parseNumericInput } from "@/components/nutrition/numeric-field";
import { useThemeColors } from "@/hooks/use-theme-colors";

const MULTIPLIERS = [0.5, 1, 2, 3] as const;
const MAX_GRAMS = 5000;

interface QuantityStepperProps {
  value: number;
  onChange: (grams: number) => void;
  /** Usual portion: ×1 of the multiplier chips. */
  portion: number;
}

/** − / grams / + with ½ ×1 ×2 ×3 shortcuts based on the usual portion. */
export function QuantityStepper({ value, onChange, portion }: QuantityStepperProps) {
  const colors = useThemeColors();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const step = value >= 50 ? 10 : 5;
  const set = (grams: number) => {
    const clamped = Math.min(Math.max(Math.round(grams), 1), MAX_GRAMS);
    Haptics.selectionAsync();
    // The field may keep focus (keyboard open): show the new value right away.
    setText(String(clamped));
    onChange(clamped);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.fill,
          borderRadius: 9,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        <StepButton label="−" accessibilityLabel={`Retirer ${step} grammes`} onPress={() => set(value - step)} />
        <View style={{ flexDirection: "row", alignItems: "baseline", paddingHorizontal: 4 }}>
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              // Commit while typing: the add button can be tapped with the keyboard open.
              const grams = parseNumericInput(t);
              if (grams != null && grams > 0 && grams <= MAX_GRAMS) onChange(Math.round(grams));
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={4}
            accessibilityLabel="Quantité en grammes"
            style={{
              width: 52,
              textAlign: "center",
              fontSize: 16,
              fontWeight: "600",
              color: colors.textPrimary,
              paddingVertical: 7,
              fontVariant: ["tabular-nums"],
            }}
          />
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>g</Text>
        </View>
        <StepButton label="+" accessibilityLabel={`Ajouter ${step} grammes`} onPress={() => set(value + step)} />
      </View>

      <View style={{ flexDirection: "row", gap: 5 }}>
        {MULTIPLIERS.map((m) => {
          const target = Math.round(portion * m);
          const active = value === target;
          return (
            <Pressable
              key={m}
              onPress={() => set(target)}
              accessibilityLabel={m === 0.5 ? "Demi-portion" : `${m} portions`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                minWidth: 36,
                paddingHorizontal: 8,
                paddingVertical: 7,
                borderRadius: 8,
                borderCurve: "continuous",
                alignItems: "center",
                backgroundColor: active ? colors.accent.calories : colors.fill,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: active ? "700" : "500",
                  color: active ? colors.onAccent : colors.textPrimary,
                }}
              >
                {m === 0.5 ? "½" : `×${m}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 38,
        paddingVertical: 6,
        alignItems: "center",
        backgroundColor: pressed ? colors.separator : "transparent",
      })}
    >
      <Text style={{ fontSize: 20, fontWeight: "600", color: colors.accent.caloriesText }}>{label}</Text>
    </Pressable>
  );
}
