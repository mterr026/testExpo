import { Text, View } from "react-native";

import { styles } from "@/shared/ui/styles";

import { formatBillCycleHeaderSummary } from "../billCycleHeader";

type BillCycleSummaryCardProps = {
  confirmCount: number;
  cycleLabel: string;
  totalDueCents: number;
};

export function BillCycleSummaryCard({
  confirmCount,
  cycleLabel,
  totalDueCents,
}: BillCycleSummaryCardProps) {
  return (
    <View accessibilityRole="summary" style={styles.purchaseCycleHeaderCard}>
      <Text style={styles.purchaseCycleHeaderTitle}>Current cycle</Text>
      <Text style={styles.purchaseCycleHeaderSummary}>
        {formatBillCycleHeaderSummary({
          confirmCount,
          cycleWindowLabel: cycleLabel,
          totalDueCents,
        })}
      </Text>
    </View>
  );
}
