import { Text, View } from "react-native";

import { styles } from "@/shared/ui/styles";

import { formatPurchaseCycleHeaderSummary } from "../purchaseCycleHeader";

type PurchaseCycleSummaryCardProps = {
  cycleLabel: string | null;
  pendingCount: number;
  totalSpentCents: number;
};

export function PurchaseCycleSummaryCard({
  cycleLabel,
  pendingCount,
  totalSpentCents,
}: PurchaseCycleSummaryCardProps) {
  return (
    <View accessibilityRole="summary" style={styles.purchaseCycleHeaderCard}>
      <Text style={styles.purchaseCycleHeaderTitle}>Current cycle</Text>
      <Text style={styles.purchaseCycleHeaderSummary}>
        {formatPurchaseCycleHeaderSummary({
          cycleWindowLabel: cycleLabel,
          pendingCount,
          totalSpentCents,
        })}
      </Text>
    </View>
  );
}
