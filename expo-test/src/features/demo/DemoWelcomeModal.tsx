import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStyles, useTheme } from "@/shared/ui/ThemeContext";
import { fontWeight, radius, spacing } from "@/shared/ui/styles";

type DemoWelcomeModalProps = {
  visible: boolean;
  error: string;
  isStarting: boolean;
  onSkip: () => void | Promise<void>;
  onStartTour: () => void | Promise<void>;
};

export function DemoWelcomeModal({
  visible,
  error,
  isStarting,
  onSkip,
  onStartTour,
}: DemoWelcomeModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade">
      <View
        style={[
          styles.page,
          {
            paddingTop: Math.max(insets.top, spacing.lg) + spacing.xl,
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <Text style={styles.helpText}>Welcome</Text>
        <Text style={styles.sectionTitle}>See your paycheck cycle</Text>
        <Text style={styles.helpText}>
          A quick look at how Budget Flow works, then sample numbers you can
          explore. Your real setup comes right after.
        </Text>

        <View
          style={{
            marginTop: spacing.xl,
            padding: spacing.xl,
            borderRadius: radius.lg,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            gap: spacing.sm,
          }}
        >
          <Text style={styles.helpText}>Sample Safe to Spend</Text>
          <Text
            style={{
              fontSize: 42,
              fontWeight: fontWeight.bold,
              color: colors.accentDark,
            }}
          >
            $487
          </Text>
          <Text style={styles.helpText}>
            Based on a $2,450 balance, $1,850 paycheck in 5 days, and bills due
            this cycle.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { marginTop: spacing.xl },
            pressed && styles.pressed,
          ]}
          disabled={isStarting}
          onPress={onStartTour}
        >
          <Text style={styles.primaryButtonText}>
            {isStarting ? "Starting..." : "Take a quick look"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { marginTop: spacing.md },
            pressed && styles.pressed,
          ]}
          disabled={isStarting}
          onPress={onSkip}
        >
          <Text style={styles.secondaryButtonText}>Set up my budget</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
