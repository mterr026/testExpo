import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import {
  EmptyState,
  money,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type {
  NextCyclePreview,
  PaycheckBillCoverage,
  PaycheckListItem,
} from "@/shared/ui/types";

import {
  getAdditionalPaychecks,
  getPrimaryPaychecks,
  splitPaycheckSchedule,
} from "./paycheckSchedule";
import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { useOptionalTutorialContext } from "@/features/tutorial/TutorialContext";
import { useTutorialScrollView } from "@/features/tutorial/hooks";
import { pickPaycheckIdForTutorialCoverage } from "@/features/tutorial/paycheckTutorial";

import { PaycheckSwipeableHeader } from "./components/PaycheckSwipeableHeader";

type PaychecksScreenProps = {
  nextCyclePreview: NextCyclePreview;
  openActionMenuForPaycheckId?: string | null;
  paycheckBillCoverage: PaycheckBillCoverage[];
  paychecks: PaycheckListItem[];
  onAddPaycheck: () => void;
  onClearOpenActionMenuTarget?: () => void;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
};

export function PaychecksScreen({
  openActionMenuForPaycheckId,
  paycheckBillCoverage,
  paychecks,
  onAddPaycheck,
  onClearOpenActionMenuTarget,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
}: PaychecksScreenProps) {
  const [showPreviousPaychecks, setShowPreviousPaychecks] = useState(false);
  const [showPreviousAdditionalIncome, setShowPreviousAdditionalIncome] =
    useState(false);
  const [expandedCoverageIds, setExpandedCoverageIds] = useState<Set<string>>(
    () => new Set()
  );
  const primaryPaychecks = getPrimaryPaychecks(paychecks);
  const additionalPaychecks = getAdditionalPaychecks(paychecks);
  const { expectedPaychecks: expectedPrimaryPaychecks, previousPaychecks: previousPrimaryPaychecks } =
    splitPaycheckSchedule(primaryPaychecks);
  const {
    expectedPaychecks: expectedAdditionalPaychecks,
    previousPaychecks: previousAdditionalPaychecks,
  } = splitPaycheckSchedule(additionalPaychecks);
  const nextExpectedPaycheck = expectedPrimaryPaychecks[0];
  const receivedTotalCents = previousPrimaryPaychecks.reduce(
    (total, paycheck) => total + paycheck.amountCents,
    0
  );
  const coverageByPaycheckId = new Map(
    paycheckBillCoverage.map((coverage) => [coverage.paycheckId, coverage])
  );
  const [openSwipePaycheckId, setOpenSwipePaycheckId] = useState<string | null>(
    null
  );
  const { onTutorialScroll, tutorialScrollRef } = useTutorialScrollView("Paychecks");
  const tutorialContext = useOptionalTutorialContext();
  const activeTutorialTargetId = tutorialContext?.activeTargetId ?? null;
  const shouldOpenCoverageForTutorial =
    activeTutorialTargetId === "paychecks-coverage-breakdown";
  const shouldHighlightRowSwipeForTutorial =
    activeTutorialTargetId === "paychecks-row-overflow";
  const tutorialFocusedPaycheckId = useMemo(() => {
    if (
      !shouldOpenCoverageForTutorial &&
      !shouldHighlightRowSwipeForTutorial
    ) {
      return null;
    }

    return pickPaycheckIdForTutorialCoverage(
      expectedPrimaryPaychecks,
      paycheckBillCoverage
    );
  }, [
    expectedPrimaryPaychecks,
    paycheckBillCoverage,
    shouldHighlightRowSwipeForTutorial,
    shouldOpenCoverageForTutorial,
  ]);
  const tutorialCoveragePaycheckId = shouldOpenCoverageForTutorial
    ? tutorialFocusedPaycheckId
    : null;

  useEffect(() => {
    if (!tutorialCoveragePaycheckId) {
      return;
    }

    setExpandedCoverageIds((current) => {
      if (current.size === 1 && current.has(tutorialCoveragePaycheckId)) {
        return current;
      }

      return new Set([tutorialCoveragePaycheckId]);
    });
  }, [tutorialCoveragePaycheckId]);

  useEffect(() => {
    if (shouldOpenCoverageForTutorial) {
      return;
    }

    setExpandedCoverageIds((current) => {
      if (current.size === 0) {
        return current;
      }

      return new Set();
    });
  }, [shouldOpenCoverageForTutorial]);

  useEffect(() => {
    if (!openActionMenuForPaycheckId) {
      return;
    }

    const paycheck = paychecks.find(
      (candidate) => candidate.id === openActionMenuForPaycheckId
    );

    if (!paycheck) {
      return;
    }

    setOpenSwipePaycheckId(paycheck.id);
    onClearOpenActionMenuTarget?.();
  }, [onClearOpenActionMenuTarget, openActionMenuForPaycheckId, paychecks]);

  function closeOpenSwipePaycheck(paycheckId: string) {
    setOpenSwipePaycheckId((currentId) =>
      currentId === paycheckId ? null : currentId
    );
  }
  function togglePaycheckCoverage(paycheckId: string) {
    setExpandedCoverageIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(paycheckId)) {
        nextIds.delete(paycheckId);
      } else {
        nextIds.add(paycheckId);
      }

      return nextIds;
    });
  }

  return (
    <ScrollView
      ref={tutorialScrollRef}
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={onTutorialScroll}
      onScrollBeginDrag={() => setOpenSwipePaycheckId(null)}
    >
      <View style={styles.screenHeaderRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.sectionTitle}>Paychecks</Text>
          <Text style={styles.helpText}>Plan each paycheck cycle.</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.inlinePrimaryButton,
            pressed && styles.pressed,
          ]}
          onPress={onAddPaycheck}
        >
          <Text style={styles.inlinePrimaryButtonText}>+ Add</Text>
        </Pressable>
      </View>

      <Text style={styles.settingsGroupTitle}>Paycheck Schedule</Text>

      <TutorialTarget id="paychecks-summary">
      <View style={styles.paycheckSummaryPanel}>
        <View style={styles.paycheckSummaryStrip}>
          <PaycheckSummaryMetric
            highlight
            label="Next Paycheck"
            value={
              nextExpectedPaycheck
                ? money(nextExpectedPaycheck.amountCents)
                : "$0.00"
            }
          />
          <PaycheckSummaryMetric
            label="Received"
            value={money(receivedTotalCents)}
          />
          <PaycheckSummaryMetric
            isLast
            label="Upcoming"
            value={String(expectedPrimaryPaychecks.length)}
          />
        </View>
      </View>
      </TutorialTarget>

      {paychecks.length === 0 ? (
        <TutorialTarget id="paychecks-upcoming">
        <EmptyState
          title="No paychecks yet"
          body="Add an expected paycheck to start building pay cycles."
        />
        </TutorialTarget>
      ) : (
        <>
          <TutorialTarget id="paychecks-upcoming">
          <PaycheckScheduleGroup
            coverageByPaycheckId={coverageByPaycheckId}
            expandedCoverageIds={expandedCoverageIds}
            openSwipePaycheckId={openSwipePaycheckId}
            onConfirmPaycheck={onConfirmPaycheck}
            onDeletePaycheck={onDeletePaycheck}
            onEditPaycheck={onEditPaycheck}
            onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
            onSwipeClose={closeOpenSwipePaycheck}
            onSwipeOpen={setOpenSwipePaycheckId}
            onToggleCoverage={togglePaycheckCoverage}
            paychecks={expectedPrimaryPaychecks}
            showTutorialCoverageTarget={shouldOpenCoverageForTutorial}
            showTutorialSwipeTarget={shouldHighlightRowSwipeForTutorial}
            tutorialFocusedPaycheckId={tutorialFocusedPaycheckId}
            title="Expected income"
          />
          </TutorialTarget>
          <AdditionalIncomeSection
            expectedPaychecks={expectedAdditionalPaychecks}
            isPreviousExpanded={showPreviousAdditionalIncome}
            openSwipePaycheckId={openSwipePaycheckId}
            onConfirmPaycheck={onConfirmPaycheck}
            onDeletePaycheck={onDeletePaycheck}
            onEditPaycheck={onEditPaycheck}
            onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
            onSwipeClose={closeOpenSwipePaycheck}
            onSwipeOpen={setOpenSwipePaycheckId}
            onTogglePrevious={() =>
              setShowPreviousAdditionalIncome((isExpanded) => !isExpanded)
            }
            previousPaychecks={previousAdditionalPaychecks}
            showTutorialTarget={
              activeTutorialTargetId === "paychecks-additional-income"
            }
          />
          <PreviousPaychecksSection
            coverageByPaycheckId={coverageByPaycheckId}
            expandedCoverageIds={expandedCoverageIds}
            isExpanded={showPreviousPaychecks}
            openSwipePaycheckId={openSwipePaycheckId}
            onConfirmPaycheck={onConfirmPaycheck}
            onDeletePaycheck={onDeletePaycheck}
            onEditPaycheck={onEditPaycheck}
            onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
            onSwipeClose={closeOpenSwipePaycheck}
            onSwipeOpen={setOpenSwipePaycheckId}
            onToggle={() =>
              setShowPreviousPaychecks((isExpanded) => !isExpanded)
            }
            onToggleCoverage={togglePaycheckCoverage}
            paychecks={previousPrimaryPaychecks}
          />
        </>
      )}
    </ScrollView>
  );
}

function AdditionalIncomeSection({
  expectedPaychecks,
  isPreviousExpanded,
  openSwipePaycheckId,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onTogglePrevious,
  previousPaychecks,
  showTutorialTarget = false,
}: {
  expectedPaychecks: PaycheckListItem[];
  isPreviousExpanded: boolean;
  openSwipePaycheckId: string | null;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: (paycheckId: string) => void;
  onSwipeOpen: (paycheckId: string) => void;
  onTogglePrevious: () => void;
  previousPaychecks: PaycheckListItem[];
  showTutorialTarget?: boolean;
}) {
  if (
    expectedPaychecks.length === 0 &&
    previousPaychecks.length === 0 &&
    !showTutorialTarget
  ) {
    return null;
  }

  const content =
    expectedPaychecks.length > 0 ? (
      <>
        <Text style={styles.paycheckSectionTitle}>Additional income</Text>
        <View style={styles.additionalIncomeGroup}>
          {expectedPaychecks.map((paycheck) => (
            <AdditionalIncomeRow
              key={paycheck.id}
              paycheck={paycheck}
              isSwipeOpen={openSwipePaycheckId === paycheck.id}
              onConfirmPaycheck={onConfirmPaycheck}
              onDeletePaycheck={onDeletePaycheck}
              onEditPaycheck={onEditPaycheck}
              onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
              onSwipeClose={() => onSwipeClose(paycheck.id)}
              onSwipeOpen={onSwipeOpen}
            />
          ))}
        </View>
      </>
    ) : showTutorialTarget ? (
      <>
        <Text style={styles.paycheckSectionTitle}>Additional income</Text>
        <View style={styles.additionalIncomeGroup}>
          <Text style={styles.helpText}>
            Side gigs, bonuses, and other deposits that are not your primary
            paycheck appear here.
          </Text>
        </View>
      </>
    ) : null;

  return (
    <TutorialTarget id="paychecks-additional-income">
      <>
        {content}
        <PreviousAdditionalIncomeSection
          isExpanded={isPreviousExpanded}
          openSwipePaycheckId={openSwipePaycheckId}
          onConfirmPaycheck={onConfirmPaycheck}
          onDeletePaycheck={onDeletePaycheck}
          onEditPaycheck={onEditPaycheck}
          onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
          onSwipeClose={onSwipeClose}
          onSwipeOpen={onSwipeOpen}
          onToggle={onTogglePrevious}
          paychecks={previousPaychecks}
        />
      </>
    </TutorialTarget>
  );
}

function PreviousAdditionalIncomeSection({
  isExpanded,
  openSwipePaycheckId,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onToggle,
  paychecks,
}: {
  isExpanded: boolean;
  openSwipePaycheckId: string | null;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: (paycheckId: string) => void;
  onSwipeOpen: (paycheckId: string) => void;
  onToggle: () => void;
  paychecks: PaycheckListItem[];
}) {
  if (paychecks.length === 0) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.paycheckSectionToggle,
          pressed && styles.pressed,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.paycheckCoverageTitle}>Previous additional income</Text>
        <Text style={styles.paycheckCoverageTotal}>
          {paychecks.length} {paychecks.length === 1 ? "payment" : "payments"}{" "}
          {isExpanded ? "⌃" : "⌄"}
        </Text>
      </Pressable>
      {isExpanded && (
        <View style={styles.additionalIncomeGroup}>
          {paychecks.map((paycheck) => (
            <AdditionalIncomeRow
              key={paycheck.id}
              paycheck={paycheck}
              isSwipeOpen={openSwipePaycheckId === paycheck.id}
              onConfirmPaycheck={onConfirmPaycheck}
              onDeletePaycheck={onDeletePaycheck}
              onEditPaycheck={onEditPaycheck}
              onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
              onSwipeClose={() => onSwipeClose(paycheck.id)}
              onSwipeOpen={onSwipeOpen}
              received
            />
          ))}
        </View>
      )}
    </>
  );
}

function AdditionalIncomeRow({
  isSwipeOpen,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  paycheck,
  received = false,
}: {
  isSwipeOpen: boolean;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: () => void;
  onSwipeOpen: (paycheckId: string) => void;
  paycheck: PaycheckListItem;
  received?: boolean;
}) {
  return (
    <View
      style={[
        styles.additionalIncomeRow,
        received && styles.additionalIncomeRowReceived,
      ]}
    >
      <PaycheckSwipeableHeader
        amountStyle={styles.additionalIncomeAmount}
        isSwipeOpen={isSwipeOpen}
        paycheck={paycheck}
        rowInset="additional"
        showStatusPill={false}
        onConfirmPaycheck={onConfirmPaycheck}
        onDeletePaycheck={onDeletePaycheck}
        onEditPaycheck={onEditPaycheck}
        onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
        onSwipeClose={onSwipeClose}
        onSwipeOpen={onSwipeOpen}
      >
        <Text style={styles.rowMetaText}>
          {formatDisplayDate(paycheck.expectedDate)} •{" "}
          {formatPaycheckRecurrence(paycheck)}
        </Text>
      </PaycheckSwipeableHeader>
    </View>
  );
}

function PreviousPaychecksSection({
  coverageByPaycheckId,
  expandedCoverageIds,
  isExpanded,
  openSwipePaycheckId,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onToggle,
  onToggleCoverage,
  paychecks,
}: {
  coverageByPaycheckId: Map<string, PaycheckBillCoverage>;
  expandedCoverageIds: Set<string>;
  isExpanded: boolean;
  openSwipePaycheckId: string | null;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: (paycheckId: string) => void;
  onSwipeOpen: (paycheckId: string) => void;
  onToggle: () => void;
  onToggleCoverage: (paycheckId: string) => void;
  paychecks: PaycheckListItem[];
}) {
  if (paychecks.length === 0) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.paycheckSectionToggle,
          pressed && styles.pressed,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.paycheckCoverageTitle}>Previous paychecks</Text>
        <Text style={styles.paycheckCoverageTotal}>
          {paychecks.length} {paychecks.length === 1 ? "paycheck" : "paychecks"}{" "}
          {isExpanded ? "⌃" : "⌄"}
        </Text>
      </Pressable>
      {isExpanded && (
        <PaycheckScheduleGroup
          coverageByPaycheckId={coverageByPaycheckId}
          expandedCoverageIds={expandedCoverageIds}
          openSwipePaycheckId={openSwipePaycheckId}
          onConfirmPaycheck={onConfirmPaycheck}
          onDeletePaycheck={onDeletePaycheck}
          onEditPaycheck={onEditPaycheck}
          onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
          onSwipeClose={onSwipeClose}
          onSwipeOpen={onSwipeOpen}
          onToggleCoverage={onToggleCoverage}
          paychecks={paychecks}
          title=""
        />
      )}
    </>
  );
}

function PaycheckSummaryMetric({
  highlight = false,
  isLast = false,
  label,
  value,
}: {
  highlight?: boolean;
  isLast?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View
      style={[
        styles.paycheckSummaryItem,
        !isLast && styles.paycheckSummaryItemDivider,
        isLast && styles.paycheckSummaryItemLast,
      ]}
    >
      <Text style={styles.paycheckSummaryLabel}>{label}</Text>
      <Text
        style={[
          styles.paycheckSummaryValue,
          highlight && styles.paycheckSummaryValueHighlight,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function PaycheckScheduleGroup({
  coverageByPaycheckId,
  expandedCoverageIds,
  openSwipePaycheckId,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onToggleCoverage,
  paychecks,
  showTutorialCoverageTarget = false,
  showTutorialSwipeTarget = false,
  tutorialFocusedPaycheckId = null,
  title,
}: {
  coverageByPaycheckId: Map<string, PaycheckBillCoverage>;
  expandedCoverageIds: Set<string>;
  openSwipePaycheckId: string | null;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: (paycheckId: string) => void;
  onSwipeOpen: (paycheckId: string) => void;
  onToggleCoverage: (paycheckId: string) => void;
  paychecks: PaycheckListItem[];
  showTutorialCoverageTarget?: boolean;
  showTutorialSwipeTarget?: boolean;
  tutorialFocusedPaycheckId?: string | null;
  title: string;
}) {
  if (paychecks.length === 0) {
    return null;
  }

  return (
    <>
      {!!title && (
        <Text style={styles.paycheckSectionTitle}>{title}</Text>
      )}
      <View style={styles.paycheckTimelineGroup}>
        {paychecks.map((paycheck) => (
          <View
            key={paycheck.id}
            style={[
              styles.paycheckTimelineRow,
              paycheck.isReceived
                ? styles.paycheckTimelineRowReceived
                : styles.paycheckTimelineRowExpected,
            ]}
          >
            {/*
              Bill coverage is derived from existing cycle data; the row stays a
              presentation surface and does not decide assignment rules.
            */}
            {showTutorialSwipeTarget &&
            paycheck.id === tutorialFocusedPaycheckId ? (
              <TutorialTarget id="paychecks-row-overflow">
                <PaycheckSwipeableHeader
                  isSwipeOpen={openSwipePaycheckId === paycheck.id}
                  paycheck={paycheck}
                  onConfirmPaycheck={onConfirmPaycheck}
                  onDeletePaycheck={onDeletePaycheck}
                  onEditPaycheck={onEditPaycheck}
                  onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
                  onSwipeClose={() => onSwipeClose(paycheck.id)}
                  onSwipeOpen={onSwipeOpen}
                >
                  <Text style={styles.rowMetaText}>
                    {formatDisplayDate(paycheck.expectedDate)} •{" "}
                    {formatPaycheckRecurrence(paycheck)}
                  </Text>
                </PaycheckSwipeableHeader>
              </TutorialTarget>
            ) : (
              <PaycheckSwipeableHeader
                isSwipeOpen={openSwipePaycheckId === paycheck.id}
                paycheck={paycheck}
                onConfirmPaycheck={onConfirmPaycheck}
                onDeletePaycheck={onDeletePaycheck}
                onEditPaycheck={onEditPaycheck}
                onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
                onSwipeClose={() => onSwipeClose(paycheck.id)}
                onSwipeOpen={onSwipeOpen}
              >
                <Text style={styles.rowMetaText}>
                  {formatDisplayDate(paycheck.expectedDate)} •{" "}
                  {formatPaycheckRecurrence(paycheck)}
                </Text>
              </PaycheckSwipeableHeader>
            )}
            <PaycheckCoveredBills
              coverage={coverageByPaycheckId.get(paycheck.id)}
              isExpanded={expandedCoverageIds.has(paycheck.id)}
              onToggle={() => onToggleCoverage(paycheck.id)}
              showTutorialTarget={
                showTutorialCoverageTarget &&
                expandedCoverageIds.has(paycheck.id)
              }
            />
          </View>
        ))}
      </View>
    </>
  );
}

function PaycheckProjectionBreakdown({
  coverage,
}: {
  coverage: PaycheckBillCoverage;
}) {
  const reservedBillCount = coverage.coveredBills.filter(
    (bill) => bill.reservationStatus === "reserved"
  ).length;

  return (
    <View style={styles.paycheckProjectionBreakdown}>
      <Text style={styles.paycheckProjectionBreakdownHelp}>
        Based on today&apos;s Safe to Spend, which already includes pending
        purchases.
      </Text>
      <View style={styles.paycheckCoverageTotalRow}>
        <Text style={styles.paycheckCoverageTitle}>Starting Safe to Spend</Text>
        <Text style={styles.paycheckCoverageAmount}>
          {money(coverage.startingSafeToSpendCents)}
        </Text>
      </View>
      {coverage.paycheckImpactCents > 0 && (
        <View style={styles.paycheckCoverageTotalRow}>
          <Text style={styles.paycheckCoverageTitle}>Expected paycheck</Text>
          <Text style={[styles.paycheckCoverageAmount, styles.paycheckProjectionCredit]}>
            +{money(coverage.paycheckImpactCents)}
          </Text>
        </View>
      )}
      {coverage.billsImpactCents > 0 && (
        <View style={styles.paycheckCoverageTotalRow}>
          <Text style={styles.paycheckCoverageTitle}>
            {coverage.isCurrentCycle
              ? "Unreserved bills this cycle"
              : "Bills this cycle"}
          </Text>
          <Text style={[styles.paycheckCoverageAmount, styles.paycheckProjectionDeduction]}>
            -{money(coverage.billsImpactCents)}
          </Text>
        </View>
      )}
      {coverage.isCurrentCycle && reservedBillCount > 0 && (
        <Text style={styles.paycheckProjectionBreakdownHelp}>
          {reservedBillCount === 1
            ? "1 bill is already reserved in Safe to Spend and is not subtracted again."
            : `${reservedBillCount} bills are already reserved in Safe to Spend and are not subtracted again.`}
        </Text>
      )}
    </View>
  );
}

function formatPaycheckBillMeta(
  bill: PaycheckBillCoverage["coveredBills"][number]
) {
  if (bill.status === "Paid" || bill.reservationStatus === "paid") {
    return "Paid";
  }

  if (bill.reservationStatus === "reserved") {
    return `In Safe to Spend • Due ${formatDisplayDate(bill.dueDate)}`;
  }

  if (bill.reservationStatus === "projected") {
    return `Projected • Due ${formatDisplayDate(bill.dueDate)}`;
  }

  return `Due ${formatDisplayDate(bill.dueDate)}`;
}

function PaycheckCoveredBills({
  coverage,
  isExpanded,
  onToggle,
  showTutorialTarget = false,
}: {
  coverage: PaycheckBillCoverage | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  showTutorialTarget?: boolean;
}) {
  if (!coverage) {
    return null;
  }

  if (coverage.coveredBills.length === 0) {
    return (
      <View style={styles.paycheckCoverageBlock}>
        <Text style={styles.rowMetaText}>
          No bills assigned to this paycheck cycle.
        </Text>
      </View>
    );
  }

  const coverageSummary =
    !coverage.canProjectBills
      ? "Needs next paycheck"
      : coverage.coveredBills.length === 1
      ? "1 bill"
      : `${coverage.coveredBills.length} bills`;
  const windowText = coverage.nextPaycheckDate
    ? `Bills due before ${formatDisplayDate(coverage.nextPaycheckDate)}`
    : "Bills due on or after this paycheck.";

  return (
    <View style={styles.paycheckCoverageBlock}>
      {coverage.canProjectBills && coverage.coveredBills.length > 0 && (
        <Text style={styles.paycheckCoverageSummaryText}>
          {coverageSummary} assigned • {money(coverage.totalCents)} reserved
        </Text>
      )}
      {isExpanded &&
        (showTutorialTarget ? (
          <TutorialTarget id="paychecks-coverage-breakdown">
            <PaycheckCoverageExpandedContent
              coverage={coverage}
              windowText={windowText}
            />
          </TutorialTarget>
        ) : (
          <PaycheckCoverageExpandedContent
            coverage={coverage}
            windowText={windowText}
          />
        ))}
      <Pressable
        accessibilityHint={
          isExpanded
            ? "Collapses the bill breakdown for this paycheck"
            : "Expands the bill breakdown for this paycheck"
        }
        accessibilityLabel={
          isExpanded ? "Hide paycheck breakdown" : "Show paycheck breakdown"
        }
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.paycheckCoveredBillsToggle,
          pressed && styles.pressed,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.paycheckBreakdownCaret}>{isExpanded ? "⌃" : "⌄"}</Text>
      </Pressable>
    </View>
  );
}

function PaycheckCoverageExpandedContent({
  coverage,
  windowText,
}: {
  coverage: PaycheckBillCoverage;
  windowText: string;
}) {
  return (
    <View style={styles.paycheckCoverageExpanded}>
      <Text style={styles.paycheckCoverageWindowText}>{windowText}</Text>
      {!coverage.canProjectBills ? (
        <Text style={styles.paycheckCoverageHelpText}>
          Add another expected paycheck after this one to calculate covered
          bills.
        </Text>
      ) : (
        <>
          <PaycheckProjectionBreakdown coverage={coverage} />
          <View style={styles.paycheckCoverageBillList}>
            {coverage.coveredBills.map((bill, index) => (
              <View
                key={bill.id}
                style={[
                  styles.paycheckCoverageBillRow,
                  index < coverage.coveredBills.length - 1 &&
                    styles.paycheckCoverageBillRowDivider,
                ]}
              >
                <View style={styles.itemCopy}>
                  <Text style={styles.paycheckCoverageName}>{bill.name}</Text>
                  <Text style={styles.rowMetaText}>
                    {formatPaycheckBillMeta(bill)}
                  </Text>
                </View>
                <Text style={styles.paycheckCoverageAmount}>
                  {money(bill.amountCents)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      {coverage.canProjectBills && (
        <>
          <View style={styles.paycheckCoverageTotalRow}>
            <Text style={styles.paycheckCoverageTitle}>Total bills</Text>
            <Text style={styles.paycheckCoverageAmount}>
              {money(coverage.totalCents)}
            </Text>
          </View>
          <View style={styles.paycheckProjectionTotalRowPrimary}>
            <Text style={styles.paycheckProjectionTotalLabel}>
              Projected Safe to Spend
            </Text>
            <Text style={styles.paycheckProjectionTotalValue}>
              {money(coverage.projectedSafeToSpendCents)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function formatPaycheckRecurrence(paycheck: PaycheckListItem) {
  if (!paycheck.recurrenceInterval) {
    return "One-time";
  }

  switch (paycheck.recurrenceInterval) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Biweekly";
    case "semimonthly":
      return "Semimonthly";
    case "monthly":
      return "Monthly";
  }
}

function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
