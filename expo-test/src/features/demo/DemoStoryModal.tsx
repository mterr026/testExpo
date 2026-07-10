import { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStyles, useTheme } from "@/shared/ui/ThemeContext";
import { fontWeight, radius, spacing } from "@/shared/ui/styles";

import { demoStorySlides } from "./demoStorySlides";

type DemoStoryModalProps = {
  visible: boolean;
  isFinishing: boolean;
  error: string;
  onBackToWelcome: () => void;
  onComplete: () => void | Promise<void>;
  onSkipToSample: () => void | Promise<void>;
};

export function DemoStoryModal({
  visible,
  isFinishing,
  error,
  onBackToWelcome,
  onComplete,
  onSkipToSample,
}: DemoStoryModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const slide = demoStorySlides[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === demoStorySlides.length - 1;

  if (!visible || !slide) {
    return null;
  }

  async function handleNext() {
    if (!isLast) {
      setStepIndex((current) => current + 1);
      return;
    }

    await onComplete();
    setStepIndex(0);
  }

  function handleBack() {
    if (isFirst) {
      onBackToWelcome();
      setStepIndex(0);
      return;
    }

    setStepIndex((current) => current - 1);
  }

  return (
    <Modal visible={visible} animationType="fade">
      <View
        style={[
          styles.page,
          {
            paddingTop: Math.max(insets.top, spacing.lg) + spacing.xl,
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            justifyContent: "space-between",
          },
        ]}
      >
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.xl,
            }}
          >
            <Text style={styles.helpText}>
              {stepIndex + 1} of {demoStorySlides.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={isFinishing}
              onPress={onSkipToSample}
            >
              <Text
                style={{
                  color: colors.accentDark,
                  fontSize: 14,
                  fontWeight: fontWeight.medium,
                }}
              >
                Skip to sample
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: spacing.sm,
              marginBottom: spacing.xxl,
            }}
          >
            {demoStorySlides.map((item, index) => (
              <View
                key={item.eyebrow}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: radius.pill,
                  backgroundColor:
                    index <= stepIndex ? colors.accentLight : colors.border,
                }}
              />
            ))}
          </View>

          <Text style={styles.helpText}>{slide.eyebrow}</Text>
          <Text style={[styles.sectionTitle, { marginTop: spacing.sm }]}>
            {slide.title}
          </Text>
          <Text style={[styles.helpText, { marginTop: spacing.md, fontSize: 16 }]}>
            {slide.body}
          </Text>

          {error ? (
            <Text style={[styles.errorText, { marginTop: spacing.lg }]}>
              {error}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                { flex: 1 },
                pressed && styles.pressed,
              ]}
              disabled={isFinishing}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>
                {isFirst ? "Back" : "Back"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { flex: 1, marginTop: 0 },
                pressed && styles.pressed,
              ]}
              disabled={isFinishing}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {isFinishing
                  ? "Loading..."
                  : isLast
                    ? "Explore sample"
                    : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
