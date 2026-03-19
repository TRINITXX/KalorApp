import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useThemeColors } from "@/hooks/use-theme-colors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export function CalorieRing({ consumed, goal, size = 160 }: CalorieRingProps) {
  const colors = useThemeColors();

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    const ratio = goal > 0 ? Math.min(consumed / goal, 1) : 0;
    progress.value = withTiming(ratio, { duration: 800 });
  }, [consumed, goal, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.isDark ? "#222222" : "#e5e7eb"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.accent.calories}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center text */}
      <View
        style={{
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          selectable
          style={{
            fontSize: size * 0.2,
            fontWeight: "700",
            color: colors.textPrimary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {consumed}
        </Text>
        <Text
          selectable
          style={{
            fontSize: size * 0.09,
            color: colors.textMuted,
            fontVariant: ["tabular-nums"],
            marginTop: 2,
          }}
        >
          / {goal} kcal
        </Text>
      </View>
    </View>
  );
}
