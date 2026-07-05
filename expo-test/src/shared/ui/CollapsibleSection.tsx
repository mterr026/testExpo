import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { hapticSelection } from "./haptics";
import { CollapseChevron } from "./CollapseChevron";
import { useStyles } from "./ThemeContext";

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
  const styles = useStyles();
  function handleToggle() {
    void hapticSelection();
    onToggle();
  }

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
        onPress={handleToggle}
      >
        <Text style={styles.paycheckCoverageTitle}>{title}</Text>
        <View style={styles.paycheckCoverageTotalRow}>
          {detail ? (
            <Text style={styles.paycheckCoverageTotal}>{detail}</Text>
          ) : null}
          <CollapseChevron expanded={expanded} />
        </View>
      </Pressable>
      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          layout={LinearTransition.duration(180)}
        >
          {children}
        </Animated.View>
      ) : null}
    </>
  );
}
