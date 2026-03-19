import { Text, TextInput, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

export function parseNumericInput(text: string): number | null {
  if (text.trim() === "") return null;
  const cleaned = text.replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

interface NumericFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  colors: ReturnType<typeof useThemeColors>;
  error?: string;
  optional?: boolean;
}

export function NumericField({
  label,
  value,
  onChangeText,
  onBlur,
  colors,
  error,
  optional,
}: NumericFieldProps) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
        {label}
        {optional ? " (optionnel)" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        placeholder="0"
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
          borderColor: error ? colors.accent.error : colors.separator,
          fontVariant: ["tabular-nums"],
        }}
      />
      {error ? (
        <Text style={{ fontSize: 12, color: colors.accent.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
