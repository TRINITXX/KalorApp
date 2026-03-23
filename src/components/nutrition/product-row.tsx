import { Image, type ImageStyle } from "expo-image";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface ProductRowProps {
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  calories?: number;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ProductRow({
  name,
  brand,
  imageUrl,
  calories,
  onPress,
  loading,
  disabled,
}: ProductRowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : disabled && !loading ? 0.4 : 1,
      })}
    >
      {/* Thumbnail */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={
            {
              width: 40,
              height: 40,
              borderRadius: 8,
              borderCurve: "continuous",
            } as unknown as ImageStyle
          }
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            borderCurve: "continuous",
            backgroundColor: colors.isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              color: colors.textMuted,
            }}
          >
            ?
          </Text>
        </View>
      )}

      {/* Name + Brand */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {brand ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {brand}
          </Text>
        ) : null}
      </View>

      {/* Loading or Calories per 100g */}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.textMuted}
          style={{ marginLeft: 8 }}
        />
      ) : calories !== undefined ? (
        <Text
          selectable
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.textMuted,
            fontVariant: ["tabular-nums"],
            marginLeft: 8,
          }}
        >
          {Math.round(calories)} kcal
        </Text>
      ) : null}
    </Pressable>
  );
}
