import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface QuantityInputProps {
  value: number;
  onChange: (v: number) => void;
}

const MAX_GRAMS = 5000;

/** Grams typed by hand. Valid values are kept as they are typed, not on blur. */
export function QuantityInput({ value, onChange }: QuantityInputProps) {
  const colors = useThemeColors();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <TextInput
        value={text}
        onChangeText={(input) => {
          const digits = input.replace(/[^0-9]/g, "");
          setText(digits);
          const grams = parseInt(digits, 10);
          if (grams > 0 && grams <= MAX_GRAMS) onChange(grams);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(String(value));
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={4}
        style={{
          width: 72,
          minHeight: 40,
          paddingHorizontal: 12,
          fontSize: 17,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
          color: colors.textPrimary,
          backgroundColor: colors.fill,
          borderRadius: 9,
          borderCurve: "continuous",
          textAlign: "center",
        }}
      />
      <Text style={{ fontSize: 16, color: colors.textSecondary }}>g</Text>
    </View>
  );
}
