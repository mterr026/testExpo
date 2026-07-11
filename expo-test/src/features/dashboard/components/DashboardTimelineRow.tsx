import { Pressable, Text, View } from "react-native";

import { money } from "@/shared/ui/components";
import { useStyles } from "@/shared/ui/ThemeContext";

import {
  formatTimelineDateParts,
  formatTimelineStatus,
  type TimelineEvent,
} from "./dashboardTimeline";

export function DashboardTimelineRow({
  event,
  isFirst,
  showConnectorBelow,
  onOpenPaychecks,
}: {
  event: TimelineEvent;
  isFirst: boolean;
  showConnectorBelow: boolean;
  onOpenPaychecks: () => void;
}) {
  const styles = useStyles();
  const isIncome = event.kind === "income";
  const dateParts = formatTimelineDateParts(event.date);
  const content = (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        {!isFirst ? (
          <View style={styles.timelineConnector} />
        ) : (
          <View style={styles.timelineConnectorSpacer} />
        )}
        <View
          style={[
            styles.timelineNode,
            isIncome ? styles.timelineNodeIncome : styles.timelineNodeBill,
          ]}
        >
          <Text
            style={[
              styles.timelineNodeIcon,
              isIncome ? styles.timelineIncomeText : styles.timelineBillText,
            ]}
          >
            {isIncome ? "↑" : "↓"}
          </Text>
        </View>
        {showConnectorBelow ? (
          <View style={styles.timelineConnector} />
        ) : (
          <View style={styles.timelineConnectorSpacer} />
        )}
      </View>

      <View style={styles.timelineRowMain}>
        <View style={styles.timelineDateColumn}>
          <Text style={styles.timelineDateMonth}>{dateParts.month}</Text>
          <Text style={styles.timelineDateDay}>{dateParts.day}</Text>
        </View>

        <View style={styles.dashboardTimelineCopy}>
          <Text style={styles.dashboardTimelineTitle}>{event.title}</Text>
          <Text
            style={[
              styles.dashboardTimelineMeta,
              isIncome
                ? styles.dashboardTimelineMetaIncome
                : styles.dashboardTimelineMetaBill,
            ]}
          >
            {formatTimelineStatus(event)}
          </Text>
        </View>

        <Text
          style={[
            styles.dashboardTimelineAmount,
            isIncome ? styles.timelineIncomeAmount : styles.timelineBillAmount,
          ]}
        >
          {isIncome ? "+" : "-"}
          {money(event.amountCents)}
        </Text>
      </View>
    </View>
  );

  if (isIncome) {
    return (
      <Pressable
        accessibilityHint="Shows the paycheck projection for this income"
        accessibilityRole="button"
        style={({ pressed }) => [pressed && styles.pressed]}
        onPress={onOpenPaychecks}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
