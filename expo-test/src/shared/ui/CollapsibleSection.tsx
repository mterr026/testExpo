import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { CollapseChevron } from "./CollapseChevron";
import { styles } from "./styles";

export function CollapsibleSection({
  accessibilityHint,
  accessibilityLabel,
  children,
  detail,
  expanded,
  onToggle,
  title,
}: {
  accessibilityHint?: string;
  accessibilityLabel: string;
  children?: ReactNode;
  detail?: string;
  expanded: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.paycheckSectionToggle,
          pressed && styles.pressed,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.paycheckCoverageTitle}>{title}</Text>
        <View style={styles.paycheckCoverageTotalRow}>
          {detail ? (
            <Text style={styles.paycheckCoverageTotal}>{detail}</Text>
          ) : null}
          <CollapseChevron expanded={expanded} />
        </View>
      </Pressable>
      {expanded ? children : null}
    </>
  );
}
