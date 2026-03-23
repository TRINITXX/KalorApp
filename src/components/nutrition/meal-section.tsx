import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import * as Haptics from "expo-haptics";

import { MEALS } from "@/constants/meals";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { EntryRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

interface MealSectionProps {
  meal: MealType;
  entries: EntryRow[];
  onDelete: (id: number) => void;
  onEdit?: (entry: EntryRow) => void;
}

export function MealSection({
  meal,
  entries,
  onDelete,
  onEdit,
}: MealSectionProps) {
  const colors = useThemeColors();

  const mealInfo = MEALS.find((m) => m.type === meal);
  const label = mealInfo?.label ?? meal;
  const subtotalKcal = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderCurve: "continuous",
        overflow: "hidden",
        boxShadow: colors.isDark
          ? "0px 2px 8px rgba(0, 0, 0, 0.3)"
          : "0px 2px 8px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 16,
          paddingBottom: entries.length > 0 ? 0 : 16,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.textPrimary,
          }}
        >
          {label}
        </Text>
        <Text
          selectable
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {Math.round(subtotalKcal)} kcal
        </Text>
      </View>

      {/* Entries */}
      {entries.map((entry, index) => (
        <SwipeableEntry
          key={entry.id}
          entry={entry}
          isFirst={index === 0}
          colors={colors}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </View>
  );
}

interface SwipeableEntryProps {
  entry: EntryRow;
  isFirst: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onDelete: (id: number) => void;
  onEdit?: (entry: EntryRow) => void;
}

function SwipeableEntry({
  entry,
  isFirst,
  colors,
  onDelete,
  onEdit,
}: SwipeableEntryProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onDelete(entry.id);
  };

  const renderRightActions = () => (
    <Pressable
      onPress={handleDelete}
      style={{
        backgroundColor: colors.accent.error,
        justifyContent: "center",
        alignItems: "center",
        width: 80,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
        Supprimer
      </Text>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <Pressable
        onPress={() => onEdit?.(entry)}
        disabled={!onEdit}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderTopWidth: isFirst ? 1 : 1,
          borderTopColor: isFirst ? colors.separator : colors.separator,
          backgroundColor: pressed
            ? colors.isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.02)"
            : colors.card,
        })}
      >
        {/* Entry info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.textPrimary,
            }}
            numberOfLines={1}
          >
            {entry.product_name}
          </Text>
          <Text
            selectable
            style={{
              fontSize: 12,
              color: colors.textMuted,
              fontVariant: ["tabular-nums"],
              marginTop: 2,
            }}
          >
            {Math.round(entry.quantity)}g
          </Text>
        </View>

        {/* Calories */}
        <Text
          selectable
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.textSecondary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {Math.round(entry.calories)} kcal
        </Text>
      </Pressable>
    </Swipeable>
  );
}
