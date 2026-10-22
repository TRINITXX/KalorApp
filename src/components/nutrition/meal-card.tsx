import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";

import { Card } from "@/components/ui/card";
import { PressableScale } from "@/components/ui/pressable-scale";
import { MEALS } from "@/constants/meals";
import { formatNumber } from "@/lib/nutrition-utils";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { EntryRow } from "@/types/database";
import type { MealType } from "@/types/nutrition";

interface MealCardProps {
  meal: MealType;
  entries: EntryRow[];
  onAdd: (meal: MealType) => void;
  onEdit: (entry: EntryRow) => void;
  onDelete: (entry: EntryRow) => void;
}

/** One meal of the day: name, total, "+" to add to it, and its foods. */
export function MealCard({ meal, entries, onAdd, onEdit, onDelete }: MealCardProps) {
  const colors = useThemeColors();
  const label = MEALS.find((m) => m.type === meal)?.label ?? meal;
  const total = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 12,
          paddingTop: 12,
          paddingBottom: entries.length > 0 ? 8 : 4,
          gap: 8,
        }}
      >
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.textPrimary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, fontVariant: ["tabular-nums"] }}>
          {formatNumber(total)} kcal
        </Text>
        <PressableScale
          onPress={() => onAdd(meal)}
          hitSlop={10}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Ajouter au ${label.toLowerCase()}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.isDark ? "rgba(48,209,88,0.18)" : "rgba(52,199,89,0.16)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView name="plus" size={14} weight="bold" tintColor={colors.accent.caloriesText} />
        </PressableScale>
      </View>

      {entries.length === 0 ? (
        <Text style={{ paddingHorizontal: 16, paddingBottom: 14, fontSize: 14, color: colors.textMuted }}>
          Rien pour l'instant
        </Text>
      ) : (
        entries.map((entry) => (
          <EntryRowView key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}
    </Card>
  );
}

function EntryRowView({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntryRow;
  onEdit: (entry: EntryRow) => void;
  onDelete: (entry: EntryRow) => void;
}) {
  const colors = useThemeColors();
  const swipeRef = useRef<SwipeableMethods>(null);

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.5}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Supprimer ${entry.product_name}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            swipeRef.current?.close();
            onDelete(entry);
          }}
          style={{
            width: 96,
            backgroundColor: colors.accent.error,
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <SymbolView name="trash" size={18} tintColor="#ffffff" />
          <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}>Supprimer</Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={() => onEdit(entry)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          paddingHorizontal: 16,
          gap: 12,
          backgroundColor: pressed ? colors.fill : colors.card,
        })}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 16,
            right: 0,
            height: 0.5,
            backgroundColor: colors.separator,
          }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, color: colors.textPrimary }}>
            {entry.product_name}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1, fontVariant: ["tabular-nums"] }}>
            {formatNumber(entry.quantity)} g
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: colors.textSecondary, fontVariant: ["tabular-nums"] }}>
          {formatNumber(entry.calories)}
        </Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
