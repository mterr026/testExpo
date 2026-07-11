import { Text, View } from "react-native";

import { useStyles } from "@/shared/ui/ThemeContext";

export function DashboardBreakdownRow({
  isLastInSection = false,
  isSubtotal = false,
  isTotal = false,
  label,
  tone = "default",
  value,
}: {
  isLastInSection?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  label: string;
  tone?: "default" | "credit" | "deduction" | "total";
  value: string;
}) {
  const styles = useStyles();
  return (
    <View
      style={[
        styles.dashboardBreakdownRow,
        isLastInSection && styles.dashboardBreakdownRowLast,
        isSubtotal && styles.dashboardBreakdownSubtotalRow,
        isTotal && styles.dashboardBreakdownTotalRow,
      ]}
    >
      <Text
        style={[
          styles.dashboardBreakdownLabel,
          isSubtotal && styles.dashboardBreakdownSubtotalLabel,
          isTotal && styles.dashboardBreakdownTotalLabel,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.dashboardBreakdownValue,
          tone === "credit" && styles.dashboardBreakdownValueCredit,
          tone === "deduction" && styles.dashboardBreakdownValueDeduction,
          tone === "total" && styles.dashboardBreakdownValueTotal,
          isSubtotal && styles.dashboardBreakdownSubtotalValue,
          isTotal && styles.dashboardBreakdownTotalValue,
          isTotal && tone === "deduction" && styles.dashboardBreakdownValueDeduction,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
