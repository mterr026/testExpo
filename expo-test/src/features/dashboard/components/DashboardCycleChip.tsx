import { Pressable, Text } from "react-native";

import { useStyles } from "@/shared/ui/ThemeContext";

export function DashboardCycleChip({
  accessibilityHint,
  hint,
  isEmpty = false,
  label,
  onPress,
  value,
}: {
  accessibilityHint: string;
  hint?: string;
  isEmpty?: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.dashboardCycleSnapshotChip,
        pressed && styles.dashboardCycleSnapshotChipPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.dashboardCycleSnapshotChipLabel}>{label}</Text>
      <Text
        style={[
          styles.dashboardCycleSnapshotChipValue,
          isEmpty && styles.dashboardCycleSnapshotChipValueMuted,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {hint ? (
        <Text style={styles.dashboardCycleSnapshotChipHint}>{hint}</Text>
      ) : null}
    </Pressable>
  );
}
