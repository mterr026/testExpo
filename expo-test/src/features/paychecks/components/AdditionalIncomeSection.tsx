import { Text, View } from "react-native";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import { ScreenSectionTitle } from "@/shared/ui/ScreenSectionTitle";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { PaycheckListItem } from "@/shared/ui/types";

import { formatDisplayDate, formatPaycheckRecurrence } from "../paycheckDisplay";
import { PaycheckSwipeableHeader } from "./PaycheckSwipeableHeader";

export function AdditionalIncomeSection({
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
