import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors, styles } from "@/shared/ui/styles";

type ImportLoadingIndicatorProps = {
  subtitle?: string;
  title: string;
  variant?: "card" | "overlay";
};

export function ImportLoadingIndicator({
  subtitle,
  title,
  variant = "card",
}: ImportLoadingIndicatorProps) {
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const content = (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={[
        styles.importLoadingCard,
        variant === "overlay" && styles.importLoadingOverlayCard,
      ]}
    >
      <View style={styles.importLoadingSpinnerWrap}>
        <Animated.View style={[styles.importLoadingPulseRing, ringStyle]} />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
      <Text style={styles.importLoadingTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.importLoadingSubtitle}>{subtitle}</Text>}
      <ImportLoadingDots />
    </Animated.View>
  );

  if (variant === "overlay") {
    return <View style={styles.importLoadingOverlay}>{content}</View>;
  }

  return content;
}

function ImportLoadingDots() {
  return (
    <View style={styles.importLoadingDotsRow}>
      {[0, 1, 2].map((index) => (
        <ImportLoadingDot key={index} delayMs={index * 180} />
      ))}
    </View>
  );
}

function ImportLoadingDot({ delayMs }: { delayMs: number }) {
  const scale = useSharedValue(0.7);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 320, easing: Easing.out(Easing.ease) }),
          withTiming(0.7, { duration: 320, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [delayMs, scale]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.importLoadingDot, dotStyle]} />;
}
