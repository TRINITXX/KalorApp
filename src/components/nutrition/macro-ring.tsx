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

interface MacroRingProps {
  label: string;
  current: number;
  goal: number | null;
  color: string;
  size?: number;
}

export function MacroRing({
  label,
  current,
  goal,
  color,
  size = 90,
}: MacroRingProps) {
  const colors = useThemeColors();

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    const ratio = goal && goal > 0 ? Math.min(current / goal, 1) : 0;
    progress.value = withTiming(ratio, { duration: 800 });
  }, [current, goal, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.isDark ? "#222222" : "#e5e7eb"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>

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
            {Math.round(current)}
          </Text>
          {goal !== null && (
            <Text
              selectable
              style={{
                fontSize: size * 0.11,
                color: colors.textMuted,
                fontVariant: ["tabular-nums"],
              }}
            >
              / {Math.round(goal)}g
            </Text>
          )}
        </View>
      </View>

      <Text
        style={{
          fontSize: 12,
          fontWeight: "500",
          color: colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
