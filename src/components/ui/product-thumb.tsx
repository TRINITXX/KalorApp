import { View } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";

import { useThemeColors } from "@/hooks/use-theme-colors";

interface ProductThumbProps {
  uri: string | null;
  size?: number;
}

/** Product photo, or a fork-and-knife placeholder for manual products. */
export function ProductThumb({ uri, size = 40 }: ProductThumbProps) {
  const colors = useThemeColors();
  const radius = Math.round(size * 0.22);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderCurve: "continuous",
        backgroundColor: colors.fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SymbolView
        name="fork.knife"
        size={Math.round(size * 0.42)}
        tintColor={colors.textMuted}
      />
    </View>
  );
}
