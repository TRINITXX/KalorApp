import { Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useThemeColors } from "@/hooks/use-theme-colors";
import type { VoiceDraft } from "@/lib/voice/run-voice";

/** What Claude understood from the dictation, shown above the list. */
export function VoiceBanner({ draft, onClose }: { draft: VoiceDraft; onClose: () => void }) {
  const colors = useThemeColors();
  const count = Object.keys(draft.selection).length;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderCurve: "continuous",
        backgroundColor: colors.isDark ? "rgba(48,209,88,0.12)" : "rgba(52,199,89,0.12)",
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 14, color: colors.textPrimary, fontStyle: "italic" }} numberOfLines={3}>
          « {draft.transcript} »
        </Text>
        <Text style={{ fontSize: 14, color: colors.textPrimary }}>
          <Text style={{ fontWeight: "700", color: colors.accent.caloriesText }}>
            {count} aliment{count > 1 ? "s" : ""} compris
          </Text>
          {draft.estimatedNames.length > 0 && (
            <Text style={{ color: colors.accent.warning }}>
              , {draft.estimatedNames.length} estimé{draft.estimatedNames.length > 1 ? "s" : ""} par Claude
            </Text>
          )}
        </Text>
        {draft.notUnderstood.length > 0 && (
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Pas compris : {draft.notUnderstood.join(", ")}
          </Text>
        )}
      </View>
      <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Masquer">
        <SymbolView name="xmark" size={13} weight="semibold" tintColor={colors.textSecondary} />
      </Pressable>
    </View>
  );
}
