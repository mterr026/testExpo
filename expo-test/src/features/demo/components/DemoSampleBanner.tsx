import { Pressable, Text, View } from "react-native";

import { useStyles, useTheme } from "@/shared/ui/ThemeContext";
import { fontWeight, radius, spacing } from "@/shared/ui/styles";

type DemoSampleBannerProps = {
  visible: boolean;
  isFinishing?: boolean;
  onSetupPress?: () => void | Promise<void>;
};

export function DemoSampleBanner({
  visible,
  isFinishing = false,
  onSetupPress,
}: DemoSampleBannerProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={{
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.accentLight + "22",
        borderWidth: 1,
        borderColor: colors.accentLight,
        gap: spacing.sm,
      }}
    >
      <Text
        style={{
          color: colors.accentDark,
          fontSize: 13,
          fontWeight: fontWeight.medium,
          textAlign: "center",
        }}
      >
        Sample data — tap around, then set up yours
      </Text>
      {onSetupPress ? (
        <Pressable
          accessibilityRole="button"
          disabled={isFinishing}
          style={({ pressed }) => [
            styles.primaryButtonTight,
            pressed && styles.pressed,
          ]}
          onPress={onSetupPress}
        >
          <Text style={styles.primaryButtonText}>
            {isFinishing ? "Setting up..." : "Set up my budget"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
