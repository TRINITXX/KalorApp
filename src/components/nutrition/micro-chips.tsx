import { Text, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface MicroChipsProps {
  fiber: number;
  sugars: number;
  saturatedFat: number;
  salt: number;
}

interface ChipData {
  label: string;
  value: number;
}

function Chip({
  label,
  value,
  cardColor,
  textMuted,
  textSecondary,
}: ChipData & { cardColor: string; textMuted: string; textSecondary: string }) {
  return (
    <View
      style={{
        backgroundColor: cardColor,
        borderRadius: 8,
        borderCurve: "continuous",
        paddingVertical: 6,
        paddingHorizontal: 10,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: textMuted,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 12,
          fontWeight: "500",
          color: textSecondary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value.toFixed(1)}g
      </Text>
    </View>
  );
}

export function MicroChips({
  fiber,
  sugars,
  saturatedFat,
  salt,
}: MicroChipsProps) {
  const colors = useThemeColors();

  const chips: ChipData[] = [
    { label: "Fibres", value: fiber },
    { label: "Sucres", value: sugars },
    { label: "Sat. fat", value: saturatedFat },
    { label: "Sel", value: salt },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
      }}
    >
      {chips.map((chip) => (
        <Chip
          key={chip.label}
          label={chip.label}
          value={chip.value}
          cardColor={colors.card}
          textMuted={colors.textMuted}
          textSecondary={colors.textSecondary}
        />
      ))}
    </View>
  );
}
