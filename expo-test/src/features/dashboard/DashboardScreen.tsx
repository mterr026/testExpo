import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Envelope } from "@/database/repositories/types";
import { formatDashboardCycleLabel } from "@/features/dashboard/dashboardCycleLabel";
import type {
  EnvelopeSnapshotEntry,
  SafeToSpendBreakdown,
} from "@/features/dashboard/adapters/dashboardViewAdapters";
import { EnvelopeSwipeableRow } from "@/features/budgeting/components/EnvelopeSwipeableRow";
import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { useOptionalTutorialContext } from "@/features/tutorial/TutorialContext";
import { useTutorialScrollView } from "@/features/tutorial/hooks";
import { EmptyState, money } from "@/shared/ui/components";
import { getFabScrollPadding } from "@/shared/ui/styles";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { Bill, PaycheckListItem } from "@/shared/ui/types";

import { DashboardBreakdownRow } from "./components/DashboardBreakdownRow";
import { DashboardCycleChip } from "./components/DashboardCycleChip";
import { DashboardTimelineRow } from "./components/DashboardTimelineRow";
import {
  buildTimelineEvents,
  formatNextPaycheckLabel,
} from "./components/dashboardTimeline";

type DashboardEnvelope = Pick<
  Envelope,
  "id" | "name" | "allocationCents" | "isPaused" | "deletedAt"
>;

export function DashboardScreen({
  activeCycleEndDate,
  activeCycleStartDate,
  nextPaycheckLabel,
  reserveCents,
  safeToSpendBreakdown,
  envelopeEntries,
  envelopes,
  envelopesEnabled,
  unpaidBills,
  unpaidBillCount,
  purchaseTotal,
  safeToSpend,
  upcomingBills,
  upcomingPaychecks,
  isLoading = false,
  onOpenBills,
  onOpenPaychecks,
  onOpenPurchases,
  onOpenSettings,
  onAddEnvelope,
  onDeleteEnvelope,
  onEditEnvelope,
  onToggleEnvelopePaused,
}: {
  activeCycleEndDate: string | null;
  activeCycleStartDate: string | null;
  nextPaycheckLabel: string;
  reserveCents: number;
  safeToSpendBreakdown: SafeToSpendBreakdown;
  envelopeEntries: EnvelopeSnapshotEntry[];
  envelopes: DashboardEnvelope[];
  envelopesEnabled: boolean;
  unpaidBills: number;
  unpaidBillCount: number;
  purchaseTotal: number;
  safeToSpend: number;
  upcomingBills: Bill[];
  upcomingPaychecks: PaycheckListItem[];
  isLoading?: boolean;
  onOpenBills: () => void;
  onOpenPaychecks: () => void;
  onOpenPurchases: () => void;
  onOpenSettings: () => void;
  onAddEnvelope: () => void;
  onDeleteEnvelope: (id: string) => void | Promise<void>;
  onEditEnvelope: (envelope: DashboardEnvelope) => void;
  onToggleEnvelopePaused: (envelope: DashboardEnvelope) => void | Promise<void>;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [showAllTimelineEvents, setShowAllTimelineEvents] = useState(false);
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  const [openSwipeEnvelopeId, setOpenSwipeEnvelopeId] = useState<string | null>(
    null
  );
  const { onTutorialScroll, tutorialScrollRef } = useTutorialScrollView("Dashboard");
  const tutorialContext = useOptionalTutorialContext();
  const shouldExpandBreakdownForTutorial =
    tutorialContext?.activeTargetId === "dashboard-breakdown";

  useEffect(() => {
    if (shouldExpandBreakdownForTutorial) {
      setIsBreakdownExpanded(true);
      return;
    }

    setIsBreakdownExpanded(false);
  }, [shouldExpandBreakdownForTutorial]);
  const isNegative = safeToSpend < 0;
  const timelineEvents = buildTimelineEvents(upcomingBills, upcomingPaychecks);
  const timelinePreview = timelineEvents.slice(0, 5);
  const visibleTimelineEvents = showAllTimelineEvents
    ? timelineEvents
    : timelinePreview;
  const hiddenTimelineCount = Math.max(0, timelineEvents.length - timelinePreview.length);
  const activeEnvelopes = envelopes.filter((envelope) => !envelope.deletedAt);
  const envelopeEntryById = new Map(
    envelopeEntries.map((entry) => [entry.envelopeId, entry])
  );
  const cycleLabel = isLoading
    ? "Loading cycle"
    : formatDashboardCycleLabel(activeCycleStartDate, activeCycleEndDate);

  return (
    <ScrollView
      ref={tutorialScrollRef}
      style={styles.content}
      contentContainerStyle={{ paddingBottom: getFabScrollPadding(insets.bottom) }}
      directionalLockEnabled
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={onTutorialScroll}
      onScrollBeginDrag={() => setOpenSwipeEnvelopeId(null)}
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
          <Pressable
            accessibilityHint="Opens the paycheck schedule"
            accessibilityRole="button"
            style={({ pressed }) => [pressed && styles.pressed]}
            onPress={onOpenPaychecks}
          >
            <Text style={styles.dashboardHeroStatusText}>
              Next paycheck: {formatNextPaycheckLabel(nextPaycheckLabel)}
            </Text>
          </Pressable>
        </View>
      </View>
      </TutorialTarget>

      <View style={styles.dashboardCycleSnapshot}>
        <View style={styles.dashboardCycleSnapshotHeader}>
          <Text style={styles.dashboardCycleSnapshotTitle}>This cycle</Text>
          <Text style={styles.dashboardCycleSnapshotDates}>{cycleLabel}</Text>
        </View>
        <View style={styles.dashboardCycleSnapshotChipRow}>
          <DashboardCycleChip
            accessibilityHint="Opens bills for this paycheck cycle"
            hint={
              unpaidBillCount > 0
                ? `${unpaidBillCount} bill${unpaidBillCount === 1 ? "" : "s"} due`
                : undefined
            }
            isEmpty={unpaidBills <= 0}
            label="Bills"
            value={unpaidBills > 0 ? money(unpaidBills) : "None due"}
            onPress={onOpenBills}
          />
          <DashboardCycleChip
            accessibilityHint="Opens purchases for this paycheck cycle"
            isEmpty={purchaseTotal <= 0}
            label="Purchases"
            value={purchaseTotal > 0 ? money(purchaseTotal) : "None yet"}
            onPress={onOpenPurchases}
          />
          <DashboardCycleChip
            accessibilityHint="Opens reserve settings"
            isEmpty={reserveCents <= 0}
            label="Reserve"
            value={reserveCents > 0 ? money(reserveCents) : "Not set"}
            onPress={onOpenSettings}
          />
        </View>
      </View>

      {envelopesEnabled && (
        <>
          <View style={styles.dashboardSectionHeader}>
            <Text style={styles.sectionTitleCompact}>Envelopes</Text>
            {activeEnvelopes.length > 0 && (
              <Pressable
                accessibilityHint="Opens the form to add a new envelope"
                accessibilityLabel="Add envelope"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.inlinePrimaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={onAddEnvelope}
              >
                <Text style={styles.inlinePrimaryButtonText}>+ Add</Text>
              </Pressable>
            )}
          </View>
          {activeEnvelopes.length === 0 ? (
            <EmptyState
              actionLabel="Add envelope"
              body="Add envelopes like Gas or Groceries to partition Safe to Spend."
              title="No envelopes yet"
              onAction={onAddEnvelope}
            />
          ) : (
            <View style={[styles.purchaseSwipeableList, styles.dashboardEnvelopeSwipeList]}>
              {activeEnvelopes.map((envelope) => (
                <EnvelopeSwipeableRow
                  key={envelope.id}
                  envelope={envelope}
                  envelopeEntry={envelopeEntryById.get(envelope.id)}
                  isSwipeOpen={openSwipeEnvelopeId === envelope.id}
                  onDeleteEnvelope={onDeleteEnvelope}
                  onEditEnvelope={onEditEnvelope}
                  onSwipeClose={() =>
                    setOpenSwipeEnvelopeId((current) =>
                      current === envelope.id ? null : current
                    )
                  }
                  onSwipeOpen={setOpenSwipeEnvelopeId}
                  onToggleEnvelopePaused={onToggleEnvelopePaused}
                />
              ))}
            </View>
          )}
        </>
      )}

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

      <TutorialTarget id="dashboard-breakdown">
        <View
          style={[
            styles.dashboardBreakdownCard,
            !isBreakdownExpanded && styles.dashboardBreakdownCardCollapsed,
          ]}
        >
          {isBreakdownExpanded && (
            <View style={styles.dashboardBreakdownBody}>
              <View style={styles.dashboardBreakdownSection}>
                <Text style={styles.dashboardBreakdownSectionTitle}>In</Text>
                {safeToSpendBreakdown.openingBalanceCents > 0 && (
                  <DashboardBreakdownRow
                    isLastInSection={safeToSpendBreakdown.confirmedIncomeCents <= 0}
                    label="Starting balance"
                    tone="credit"
                    value={`+${money(safeToSpendBreakdown.openingBalanceCents)}`}
                  />
                )}
                <DashboardBreakdownRow
                  isLastInSection
                  label="Confirmed income"
                  tone="credit"
                  value={`+${money(safeToSpendBreakdown.confirmedIncomeCents)}`}
                />
              </View>

              {(safeToSpendBreakdown.chargedPurchasesCents > 0 ||
                safeToSpendBreakdown.pendingPurchasesCents > 0 ||
                safeToSpendBreakdown.paidBillsCents > 0) && (
                <View style={styles.dashboardBreakdownSection}>
                  <Text style={styles.dashboardBreakdownSectionTitle}>
                    Adjustments
                  </Text>
                  {safeToSpendBreakdown.chargedPurchasesCents > 0 && (
                    <DashboardBreakdownRow
                      isLastInSection={
                        safeToSpendBreakdown.pendingPurchasesCents <= 0 &&
                        safeToSpendBreakdown.paidBillsCents <= 0
                      }
                      label="Charged purchases"
                      tone="deduction"
                      value={`-${money(safeToSpendBreakdown.chargedPurchasesCents)}`}
                    />
                  )}
                  {safeToSpendBreakdown.pendingPurchasesCents > 0 && (
                    <DashboardBreakdownRow
                      isLastInSection={safeToSpendBreakdown.paidBillsCents <= 0}
                      label="Pending purchases"
                      tone="deduction"
                      value={`-${money(safeToSpendBreakdown.pendingPurchasesCents)}`}
                    />
                  )}
                  {safeToSpendBreakdown.paidBillsCents > 0 && (
                    <DashboardBreakdownRow
                      isLastInSection
                      label="Paid bills"
                      tone="deduction"
                      value={`-${money(safeToSpendBreakdown.paidBillsCents)}`}
                    />
                  )}
                </View>
              )}

              <DashboardBreakdownRow
                isSubtotal
                label="Available balance"
                value={money(safeToSpendBreakdown.runningBalanceCents)}
              />

              <View style={styles.dashboardBreakdownSection}>
                <Text style={styles.dashboardBreakdownSectionTitle}>Committed</Text>
                <DashboardBreakdownRow
                  isLastInSection={safeToSpendBreakdown.envelopeReservedCents <= 0}
                  label="Upcoming bills"
                  tone="deduction"
                  value={`-${money(safeToSpendBreakdown.unpaidBillsCents)}`}
                />
                <DashboardBreakdownRow
                  isLastInSection={safeToSpendBreakdown.envelopeReservedCents <= 0}
                  label="Reserve"
                  tone="deduction"
                  value={`-${money(safeToSpendBreakdown.essentialReserveCents)}`}
                />
                {safeToSpendBreakdown.envelopeReservedCents > 0 && (
                  <DashboardBreakdownRow
                    isLastInSection
                    label="Envelope reserve"
                    tone="deduction"
                    value={`-${money(safeToSpendBreakdown.envelopeReservedCents)}`}
                  />
                )}
              </View>

              <DashboardBreakdownRow
                isTotal
                label="Safe to Spend"
                tone={isNegative ? "deduction" : "total"}
                value={money(safeToSpendBreakdown.safeToSpendCents)}
              />
            </View>
          )}
          <Pressable
            accessibilityHint={
              isBreakdownExpanded
                ? "Collapses the Safe to Spend breakdown"
                : "Expands the Safe to Spend breakdown"
            }
            accessibilityLabel={
              isBreakdownExpanded
                ? "Hide safe to spend calculation"
                : "Safe to spend calculation"
            }
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.paycheckCoverageLinkToggle,
              !isBreakdownExpanded && styles.dashboardBreakdownToggleCollapsed,
              !isBreakdownExpanded && pressed && styles.pressed,
            ]}
            onPress={() => setIsBreakdownExpanded((expanded) => !expanded)}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.paycheckCoverageLinkText,
                  pressed && styles.paycheckCoverageLinkTextPressed,
                ]}
              >
                {isBreakdownExpanded
                  ? "Hide safe to spend calculation"
                  : "Safe to spend calculation"}
              </Text>
            )}
          </Pressable>
        </View>
      </TutorialTarget>

    </ScrollView>
  );
}
