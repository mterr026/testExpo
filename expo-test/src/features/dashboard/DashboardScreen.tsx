import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { SafeToSpendBreakdown } from "@/engine";
import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { useTutorialScrollView } from "@/features/tutorial/hooks";
import { money } from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { Bill, PaycheckListItem } from "@/shared/ui/types";

type TimelineEvent = {
  id: string;
  amountCents: number;
  date: string;
  kind: "bill" | "income";
  status: string;
  title: string;
};

export function DashboardScreen({
  nextPaycheckLabel,
  reserveCents,
  safeToSpendBreakdown,
  unpaidBills,
  unpaidBillCount,
  purchaseTotal,
  safeToSpend,
  upcomingBills,
  upcomingPaychecks,
  isLoading = false,
  onOpenPaychecks,
}: {
  nextPaycheckLabel: string;
  reserveCents: number;
  safeToSpendBreakdown: SafeToSpendBreakdown;
  unpaidBills: number;
  unpaidBillCount: number;
  purchaseTotal: number;
  safeToSpend: number;
  upcomingBills: Bill[];
  upcomingPaychecks: PaycheckListItem[];
  isLoading?: boolean;
  onOpenPaychecks: () => void;
}) {
  const [showAllTimelineEvents, setShowAllTimelineEvents] = useState(false);
  const { onTutorialScroll, tutorialScrollRef } = useTutorialScrollView("Dashboard");
  const isNegative = safeToSpend < 0;
  const timelineEvents = buildTimelineEvents(upcomingBills, upcomingPaychecks);
  const timelinePreview = timelineEvents.slice(0, 5);
  const visibleTimelineEvents = showAllTimelineEvents
    ? timelineEvents
    : timelinePreview;
  const hiddenTimelineCount = Math.max(0, timelineEvents.length - timelinePreview.length);

  return (
    <ScrollView
      ref={tutorialScrollRef}
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={onTutorialScroll}
    >
      <TutorialTarget id="dashboard-safe-to-spend">
      <View style={[styles.dashboardHeroCard, isNegative && styles.warningCard]}>
        <View style={styles.dashboardHeroFocus}>
          <Text style={styles.dashboardHeroLabel}>Safe to Spend</Text>
          <Text
            style={[
              styles.safeAmount,
              styles.dashboardHeroAmount,
              isNegative && styles.warningText,
            ]}
          >
            {money(safeToSpend)}
          </Text>
        </View>
        <Text style={styles.dashboardHeroSubcopy}>
          Based on current paycheck cycle
        </Text>
        <View style={styles.dashboardHeroStatusLine}>
          <Text style={styles.dashboardHeroStatusText}>
            Next paycheck: {formatNextPaycheckLabel(nextPaycheckLabel)}
          </Text>
        </View>
        <Text style={styles.dashboardHeroReserveText}>
          {isLoading
            ? "Loading cycle details"
            : `${money(unpaidBills)} set aside for upcoming bills`}
        </Text>
      </View>
      </TutorialTarget>

      <View style={styles.dashboardSummaryPanel}>
        <View style={styles.dashboardSummaryStrip}>
          <DashboardSummaryItem
            label="Upcoming Bills"
            isEmpty={unpaidBills <= 0}
            value={unpaidBills > 0 ? money(unpaidBills) : "None scheduled"}
          />
          <DashboardSummaryItem
            label="Purchases this cycle"
            isEmpty={purchaseTotal <= 0}
            value={purchaseTotal > 0 ? money(purchaseTotal) : "None recorded"}
          />
          <DashboardSummaryItem
            label="Reserve"
            isEmpty={reserveCents <= 0}
            isLast
            value={reserveCents > 0 ? money(reserveCents) : "Not set"}
          />
        </View>
      </View>

      <View style={styles.dashboardSectionHeader}>
        <Text style={styles.sectionTitleCompact}>Upcoming Bills & Income</Text>
      </View>

      <View style={styles.comingUpCard}>
        {visibleTimelineEvents.length > 0 ? (
          <>
            <View style={styles.timelineList}>
              {visibleTimelineEvents.map((event, index) => (
                <DashboardTimelineRow
                  event={event}
                  isFirst={index === 0}
                  key={event.id}
                  showConnectorBelow={
                    index < visibleTimelineEvents.length - 1 ||
                    hiddenTimelineCount > 0
                  }
                  onOpenPaychecks={onOpenPaychecks}
                />
              ))}
            </View>
            {hiddenTimelineCount > 0 && (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.dashboardTimelineFooter,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setShowAllTimelineEvents((isShowingAll) => !isShowingAll)
                }
              >
                <Text style={styles.dashboardTimelineMoreText}>
                  {showAllTimelineEvents
                    ? "Show fewer incoming transactions"
                    : "View all incoming transactions"}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={[styles.rowMetaText, styles.timelineEmptyText]}>
            Add paychecks and bills to build your timeline.
          </Text>
        )}
      </View>

      <View style={styles.dashboardSectionHeader}>
        <Text style={styles.sectionTitleCompact}>Safe to Spend Breakdown</Text>
      </View>

      <TutorialTarget id="dashboard-breakdown">
      <View style={styles.dashboardBreakdownCard}>
        {safeToSpendBreakdown.openingBalanceCents > 0 && (
          <DashboardBreakdownRow
            label="Starting balance"
            value={`+${money(safeToSpendBreakdown.openingBalanceCents)}`}
          />
        )}
        <DashboardBreakdownRow
          label="Confirmed income"
          tone="credit"
          value={`+${money(safeToSpendBreakdown.confirmedIncomeCents)}`}
        />
        {safeToSpendBreakdown.chargedPurchasesCents > 0 && (
          <DashboardBreakdownRow
            label="Charged purchases"
            tone="deduction"
            value={`-${money(safeToSpendBreakdown.chargedPurchasesCents)}`}
          />
        )}
        {safeToSpendBreakdown.pendingPurchasesCents > 0 && (
          <DashboardBreakdownRow
            label="Pending purchases"
            tone="deduction"
            value={`-${money(safeToSpendBreakdown.pendingPurchasesCents)}`}
          />
        )}
        {safeToSpendBreakdown.paidBillsCents > 0 && (
          <DashboardBreakdownRow
            label="Paid bills"
            tone="deduction"
            value={`-${money(safeToSpendBreakdown.paidBillsCents)}`}
          />
        )}
        <DashboardBreakdownRow
          isSubtotal
          label="Available balance"
          value={money(safeToSpendBreakdown.runningBalanceCents)}
        />
        <DashboardBreakdownRow
          label="Upcoming bills"
          tone="deduction"
          value={`-${money(safeToSpendBreakdown.unpaidBillsCents)}`}
        />
        <DashboardBreakdownRow
          label="Reserve"
          tone="deduction"
          value={`-${money(safeToSpendBreakdown.essentialReserveCents)}`}
        />
        <DashboardBreakdownRow
          isTotal
          label="Safe to Spend"
          tone={isNegative ? "deduction" : "total"}
          value={money(safeToSpendBreakdown.safeToSpendCents)}
        />
      </View>
      </TutorialTarget>

    </ScrollView>
  );
}

function formatMonth(month: number) {
  return [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][month - 1] ?? "";
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatTimelineDateParts(date: string) {
  if (!isIsoDate(date)) {
    return { day: "—", month: "" };
  }

  const [, month, day] = date.split("-");

  return {
    day: String(Number(day)),
    month: formatMonth(Number(month)),
  };
}

function formatTimelineDate(date: string) {
  if (!isIsoDate(date)) {
    return "Bill";
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
}

function DashboardTimelineRow({
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

function formatNextPaycheckLabel(label: string) {
  if (!isIsoDate(label)) {
    return label;
  }

  return formatTimelineDate(label);
}

function DashboardSummaryItem({
  isEmpty = false,
  isLast = false,
  label,
  value,
}: {
  isEmpty?: boolean;
  isLast?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View
      style={[
        styles.dashboardSummaryItem,
        !isLast && styles.dashboardSummaryItemDivider,
        isLast && styles.dashboardSummaryItemLast,
      ]}
    >
      <Text style={styles.dashboardSummaryLabel}>{label}</Text>
      <Text
        style={[
          styles.dashboardSummaryValue,
          isEmpty && styles.dashboardSummaryEmptyValue,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function DashboardBreakdownRow({
  isSubtotal = false,
  isTotal = false,
  label,
  tone = "default",
  value,
}: {
  isSubtotal?: boolean;
  isTotal?: boolean;
  label: string;
  tone?: "default" | "credit" | "deduction" | "total";
  value: string;
}) {
  return (
    <View
      style={[
        styles.dashboardBreakdownRow,
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

function formatTimelineStatus(event: TimelineEvent) {
  if (event.kind === "income") {
    return "Expected Income";
  }

  if (event.status === "Projected") {
    return "Projected Bill";
  }

  if (event.status === "Due" || event.status === "Needs confirmation") {
    return "Due Soon";
  }

  return "Upcoming Bill";
}

function buildTimelineEvents(
  bills: Bill[],
  paychecks: PaycheckListItem[]
): TimelineEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const billEvents = bills
    .filter((bill) =>
      (bill.status === "Due" ||
        bill.status === "Needs confirmation" ||
        bill.status === "Scheduled" ||
        bill.status === "Projected")
    )
    .map<TimelineEvent>((bill) => ({
      id: `bill-${bill.id}`,
      amountCents: bill.amountCents,
      date: bill.dueDate,
      kind: "bill",
      status: bill.status,
      title: bill.name,
    }));
  const paycheckEvents = paychecks
    .filter((paycheck) => paycheck.expectedDate >= today)
    .map<TimelineEvent>((paycheck) => ({
      id: `paycheck-${paycheck.id}`,
      amountCents: paycheck.amountCents,
      date: paycheck.expectedDate,
      kind: "income",
      status: paycheck.isReceived ? "Received" : "Expected",
      title: paycheck.label,
    }));

  return [...billEvents, ...paycheckEvents].sort((first, second) => {
    const dateCompare = sortDate(first).localeCompare(sortDate(second));

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return first.kind.localeCompare(second.kind);
  });
}

function sortDate(event: TimelineEvent) {
  if (isIsoDate(event.date)) {
    return event.date;
  }

  return event.kind === "bill" ? "9999-12-30" : "9999-12-31";
}
