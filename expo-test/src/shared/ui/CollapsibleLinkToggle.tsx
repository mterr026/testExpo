import { Pressable, Text } from "react-native";

import { styles } from "./styles";

export function CollapsibleLinkToggle({
  accessibilityHint,
  accessibilityLabel,
  expanded,
  expandedLabel,
  collapsedLabel,
  onToggle,
}: {
  accessibilityHint?: string;
  accessibilityLabel: string;
  expanded: boolean;
  expandedLabel: string;
  collapsedLabel: string;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      style={styles.paycheckCoverageLinkToggle}
      onPress={onToggle}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.paycheckCoverageLinkText,
            pressed && styles.paycheckCoverageLinkTextPressed,
          ]}
        >
          {expanded ? expandedLabel : collapsedLabel}
        </Text>
      )}
    </Pressable>
  );
}
