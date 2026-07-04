import { Text, View } from "react-native";

import { styles } from "@/shared/ui/styles";
import type { PaycheckBillCoverage, PaycheckListItem } from "@/shared/ui/types";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";

import { PaycheckCoveredBills } from "./PaycheckCoveredBills";
import { PaycheckSwipeableHeader } from "./PaycheckSwipeableHeader";

type PaycheckTimelineRowProps = {
  coverage: PaycheckBillCoverage | undefined;
  expandedCoverageIds: Set<string>;
  isSwipeOpen: boolean;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: () => void;
  onSwipeOpen: (paycheckId: string) => void;
  onToggleCoverage: (paycheckId: string) => void;
  paycheck: PaycheckListItem;
  showTutorialCoverageTarget?: boolean;
  showTutorialSwipeTarget?: boolean;
  toggleStyle?: "caret" | "link";
  variant?: "default" | "hero";
  wrapUpcomingTutorialTarget?: boolean;
};

export function PaycheckTimelineRow({
  coverage,
  expandedCoverageIds,
  isSwipeOpen,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  onToggleCoverage,
  paycheck,
  showTutorialCoverageTarget = false,
  showTutorialSwipeTarget = false,
  toggleStyle = "caret",
  variant = "default",
  wrapUpcomingTutorialTarget = false,
}: PaycheckTimelineRowProps) {
  const isHero = variant === "hero";
  const swipeHeader = (
    <PaycheckSwipeableHeader
      isSwipeOpen={isSwipeOpen}
      paycheck={paycheck}
      variant={variant}
      onConfirmPaycheck={onConfirmPaycheck}
      onDeletePaycheck={onDeletePaycheck}
      onEditPaycheck={onEditPaycheck}
      onMarkPaycheckUnreceived={onMarkPaycheckUnreceived}
      onSwipeClose={onSwipeClose}
      onSwipeOpen={onSwipeOpen}
    >
      <Text
        style={[
          styles.rowMetaText,
          isHero && styles.paycheckNextHeroSubcopy,
        ]}
      >
        {formatDisplayDate(paycheck.expectedDate)} •{" "}
        {formatPaycheckRecurrence(paycheck)}
      </Text>
    </PaycheckSwipeableHeader>
  );

  const swipeSection =
    showTutorialSwipeTarget ? (
      <TutorialTarget id="paychecks-row-overflow">{swipeHeader}</TutorialTarget>
    ) : wrapUpcomingTutorialTarget ? (
      <TutorialTarget id="paychecks-upcoming">{swipeHeader}</TutorialTarget>
    ) : (
      swipeHeader
    );

  return (
    <View
      style={[
        isHero ? styles.paycheckNextHeroCard : styles.paycheckTimelineRow,
        !isHero &&
          (paycheck.isReceived
            ? styles.paycheckTimelineRowReceived
            : styles.paycheckTimelineRowExpected),
      ]}
    >
      {swipeSection}
      <PaycheckCoveredBills
        coverage={coverage}
        isExpanded={expandedCoverageIds.has(paycheck.id)}
        showTutorialTarget={
          showTutorialCoverageTarget && expandedCoverageIds.has(paycheck.id)
        }
        toggleStyle={toggleStyle}
        onToggle={() => onToggleCoverage(paycheck.id)}
      />
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
