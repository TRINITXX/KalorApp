import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface QuantityInputProps {
  value: number;
  onChange: (v: number) => void;
}

export function QuantityInput({ value, onChange }: QuantityInputProps) {
  const colors = useThemeColors();
  const [text, setText] = useState(String(value));

  const handleChangeText = (input: string) => {
    // Allow only digits
    const cleaned = input.replace(/[^0-9]/g, "");
    setText(cleaned);
  };

  const handleBlur = () => {
    const parsed = parseInt(text, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > 5000) {
      setText("100");
      onChange(100);
    } else {
      setText(String(parsed));
      onChange(parsed);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <TextInput
        value={text}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        keyboardType="numeric"
        selectTextOnFocus
        style={{
          minWidth: 60,
          minHeight: 44,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 16,
          fontWeight: "500",
          fontVariant: ["tabular-nums"],
          color: colors.textPrimary,
          backgroundColor: colors.card,
          borderRadius: 10,
          borderCurve: "continuous",
          textAlign: "center",
          borderWidth: 1,
          borderColor: colors.separator,
        }}
      />
      <Text
        style={{
          fontSize: 16,
          color: colors.textMuted,
          fontWeight: "500",
        }}
      >
        g
      </Text>
    </View>
  );
}
