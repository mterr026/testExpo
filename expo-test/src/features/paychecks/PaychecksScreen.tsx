import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import {
  EmptyState,
} from "@/shared/ui/components";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import { ScreenSectionTitle } from "@/shared/ui/ScreenSectionTitle";
import { ScreenShell } from "@/shared/ui/ScreenShell";
import { useStyles } from "@/shared/ui/ThemeContext";
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

import { NextPaycheckHero } from "./components/NextPaycheckHero";
import { PaycheckSwipeableHeader } from "./components/PaycheckSwipeableHeader";
import { PaycheckTimelineRow } from "./components/PaycheckTimelineRow";

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
  const styles = useStyles();
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
  const laterExpectedPaychecks = expectedPrimaryPaychecks.slice(1);
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
      directionalLockEnabled
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={onTutorialScroll}
      onScrollBeginDrag={() => setOpenSwipePaycheckId(null)}
    >
      <ScreenShell
        headerAction={
          <Pressable
            style={({ pressed }) => [
              styles.inlinePrimaryButton,
              pressed && styles.pressed,
            ]}
            onPress={onAddPaycheck}
          >
            <Text style={styles.inlinePrimaryButtonText}>+ Add</Text>
          </Pressable>
        }
        subtitle="Plan each paycheck cycle."
        title="Paychecks"
      />

      <ScreenSectionTitle title="Paycheck Schedule" />

      {nextExpectedPaycheck ? (
        <TutorialTarget id="paychecks-summary">
          <NextPaycheckHero
            coverage={coverageByPaycheckId.get(nextExpectedPaycheck.id)}
            expandedCoverageIds={expandedCoverageIds}
            isSwipeOpen={openSwipePaycheckId === nextExpectedPaycheck.id}
            paycheck={nextExpectedPaycheck}
            receivedTotalCents={receivedTotalCents}
            showTutorialCoverageTarget={shouldOpenCoverageForTutorial}
            showTutorialSwipeTarget={
              shouldHighlightRowSwipeForTutorial &&
              nextExpectedPaycheck.id === tutorialFocusedPaycheckId
            }
            showTutorialUpcomingTarget={laterExpectedPaychecks.length === 0}
            upcomingCount={expectedPrimaryPaychecks.length}
            onConfirmPaycheck={onConfirmPaycheck}
            onDeletePaycheck={onDeletePaycheck}
            onEditPaycheck={onEditPaycheck}
            onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
            onSwipeClose={() => closeOpenSwipePaycheck(nextExpectedPaycheck.id)}
            onSwipeOpen={setOpenSwipePaycheckId}
            onToggleCoverage={togglePaycheckCoverage}
          />
        </TutorialTarget>
      ) : null}

      {paychecks.length === 0 ? (
        <TutorialTarget id="paychecks-upcoming">
        <EmptyState
          actionLabel="Add paycheck"
          body="Add an expected paycheck to start building pay cycles."
          title="No paychecks yet"
          onAction={onAddPaycheck}
        />
        </TutorialTarget>
      ) : (
        <>
          {laterExpectedPaychecks.length > 0 ? (
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
                paychecks={laterExpectedPaychecks}
                showTutorialCoverageTarget={shouldOpenCoverageForTutorial}
                showTutorialSwipeTarget={shouldHighlightRowSwipeForTutorial}
                tutorialFocusedPaycheckId={tutorialFocusedPaycheckId}
                title="Later paychecks"
              />
            </TutorialTarget>
          ) : null}
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
  const styles = useStyles();
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
        <ScreenSectionTitle title="Additional income" />
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
        <ScreenSectionTitle title="Additional income" />
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
  const styles = useStyles();
  if (paychecks.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection
      accessibilityHint={
        isExpanded
          ? "Collapses previous additional income"
          : "Expands previous additional income"
      }
      accessibilityLabel="Previous additional income"
      detail={`${paychecks.length} ${paychecks.length === 1 ? "payment" : "payments"}`}
      expanded={isExpanded}
      title="Previous additional income"
      onToggle={onToggle}
    >
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
    </CollapsibleSection>
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
  const styles = useStyles();
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
    <CollapsibleSection
      accessibilityHint={
        isExpanded ? "Collapses previous paychecks" : "Expands previous paychecks"
      }
      accessibilityLabel="Previous paychecks"
      detail={`${paychecks.length} ${paychecks.length === 1 ? "paycheck" : "paychecks"}`}
      expanded={isExpanded}
      title="Previous paychecks"
      onToggle={onToggle}
    >
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
    </CollapsibleSection>
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
  const styles = useStyles();
  if (paychecks.length === 0) {
    return null;
  }

  return (
    <>
      {!!title && <ScreenSectionTitle title={title} />}
      <View style={styles.paycheckTimelineGroup}>
        {paychecks.map((paycheck) => (
          <PaycheckTimelineRow
            key={paycheck.id}
            coverage={coverageByPaycheckId.get(paycheck.id)}
            expandedCoverageIds={expandedCoverageIds}
            isSwipeOpen={openSwipePaycheckId === paycheck.id}
            paycheck={paycheck}
            showTutorialCoverageTarget={showTutorialCoverageTarget}
            showTutorialSwipeTarget={
              showTutorialSwipeTarget &&
              paycheck.id === tutorialFocusedPaycheckId
            }
            onConfirmPaycheck={onConfirmPaycheck}
            onDeletePaycheck={onDeletePaycheck}
            onEditPaycheck={onEditPaycheck}
            onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
            onSwipeClose={() => onSwipeClose(paycheck.id)}
            onSwipeOpen={onSwipeOpen}
            onToggleCoverage={onToggleCoverage}
          />
        ))}
      </View>
    </>
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
