import { Text, View } from "react-native";

import { styles } from "./styles";

export function CycleSummaryCard({
  summary,
  title = "Current cycle",
  variant = "compact",
}: {
  summary: string;
  title?: string;
  variant?: "compact" | "hero";
}) {
  return (
    <View
      accessibilityRole="summary"
      style={
        variant === "hero"
          ? styles.cycleSummaryCardHero
          : styles.cycleSummaryCardCompact
      }
    >
      <Text style={styles.cycleSummaryCardTitle}>{title}</Text>
      <Text style={styles.cycleSummaryCardSummary}>{summary}</Text>
    </View>
  );
}
