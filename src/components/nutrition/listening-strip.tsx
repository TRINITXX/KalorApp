import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface ListeningStripProps {
  phase: "listening" | "stopping" | "thinking";
  transcript: string;
  /** Microphone level from 0 to 1. */
  level: number;
  onFinish: () => void;
  onCancel: () => void;
}

/**
 * Takes the place of the search field while the user dictates: live words,
 * a pulsing dot that follows the voice, "Terminé" or the word "stop" to finish.
 */
export function ListeningStrip({ phase, transcript, level, onFinish, onCancel }: ListeningStripProps) {
  const colors = useThemeColors();
  const listening = phase === "listening";

  return (
    <View
      style={{
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderColor: colors.accent.calories,
        backgroundColor: colors.card,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {phase === "thinking" ? (
          <ActivityIndicator size="small" color={colors.accent.caloriesText} />
        ) : (
          <PulseDot level={listening ? level : 0} />
        )}
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: colors.accent.caloriesText }}>
          {phase === "thinking"
            ? "Claude trie tes aliments…"
            : listening
              ? "Je t'écoute… dis « stop » quand tu as fini"
              : "Fin de l'écoute…"}
        </Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: "600", color: transcript ? colors.textPrimary : colors.textMuted }}>
        {transcript || "Ex. : 200 g de poulet, du riz et un yaourt"}
      </Text>
      {phase !== "thinking" && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flex: 1,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.fill,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>Annuler</Text>
          </Pressable>
          <Pressable
            onPress={onFinish}
            disabled={!listening}
            accessibilityRole="button"
            accessibilityLabel="Terminer la dictée"
            style={({ pressed }) => ({
              flex: 1.4,
              height: 40,
              borderRadius: 20,
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent.calories,
              opacity: !listening ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <SymbolView name="stop.fill" size={13} tintColor={colors.onAccent} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.onAccent }}>Terminé</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PulseDot({ level }: { level: number }) {
  const halo = useSharedValue(0);

  useEffect(() => {
    halo.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1);
  }, [halo]);

  // The halo breathes on its own and grows with the voice.
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.value * 0.6 + level * 0.8 }],
    opacity: 0.35 - halo.value * 0.15,
  }));

  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[{ position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: "#ff453a" }, haloStyle]}
      />
      <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#ff453a" }} />
    </View>
  );
}
