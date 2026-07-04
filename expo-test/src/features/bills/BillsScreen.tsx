import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import {
  EmptyState,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { Bill } from "@/shared/ui/types";

import { TutorialTarget } from "@/features/tutorial/TutorialTarget";
import { useTutorialScrollView } from "@/features/tutorial/hooks";

import { BillCycleSummaryCard } from "./components/BillCycleSummaryCard";
import { BillSwipeableRow } from "./components/BillSwipeableRow";

export function BillsScreen({
  actionError = "",
  bills,
  cycleLabel,
  dueThisCycleBills,
  openActionMenuForBillId,
  onAddBill,
  onClearOpenActionMenuTarget,
  onDeleteBill,
  onEditBill,
  onMarkPaid,
  onMarkUnpaid,
  onConfirmBill,
  onToggleBillPaused,
}: {
  actionError?: string;
  bills: Bill[];
  cycleLabel: string;
  dueThisCycleBills?: Bill[];
  openActionMenuForBillId?: string | null;
  onAddBill: () => void;
  onClearOpenActionMenuTarget?: () => void;
  onDeleteBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void | Promise<void>;
  onMarkUnpaid: (bill: Bill) => void | Promise<void>;
  onConfirmBill: (bill: Bill) => void;
  onToggleBillPaused: (bill: Bill) => void;
}) {
  const currentCycleBills =
    dueThisCycleBills ??
    bills.filter(
      (bill) =>
        bill.status !== "Scheduled" &&
        bill.status !== "Paid" &&
        bill.status !== "Paused"
    );
  const paidBills = bills.filter((bill) => bill.status === "Paid");
  const pausedBills = bills.filter((bill) => bill.status === "Paused");
  const scheduledBills = bills.filter((bill) => bill.status === "Scheduled");
  const confirmCount = currentCycleBills.filter(
    (bill) => bill.status === "Needs confirmation"
  ).length;
  const totalDueCents = currentCycleBills.reduce(
    (total, bill) => total + bill.amountCents,
    0
  );
  const [showPaidBills, setShowPaidBills] = useState(false);
  const [showPausedBills, setShowPausedBills] = useState(false);
  const [openSwipeBillId, setOpenSwipeBillId] = useState<string | null>(null);
  const { onTutorialScroll, tutorialScrollRef } = useTutorialScrollView("Bills");

  useEffect(() => {
    if (!openActionMenuForBillId) {
      return;
    }

    const bill =
      bills.find((candidate) => candidate.id === openActionMenuForBillId) ??
      currentCycleBills.find((candidate) => candidate.id === openActionMenuForBillId);

    if (!bill) {
      return;
    }

    setOpenSwipeBillId(bill.id);
    onClearOpenActionMenuTarget?.();
  }, [bills, currentCycleBills, onClearOpenActionMenuTarget, openActionMenuForBillId]);

  function closeOpenSwipeBill(billId: string) {
    setOpenSwipeBillId((currentId) =>
      currentId === billId ? null : currentId
    );
  }

  function renderBillRow(bill: Bill, showTutorialSwipeTarget = false) {
    const row = (
      <BillSwipeableRow
        bill={bill}
        isSwipeOpen={openSwipeBillId === bill.id}
        onConfirmBill={onConfirmBill}
        onDeleteBill={onDeleteBill}
        onEditBill={onEditBill}
        onMarkPaid={onMarkPaid}
        onMarkUnpaid={onMarkUnpaid}
        onSwipeClose={() => closeOpenSwipeBill(bill.id)}
        onSwipeOpen={setOpenSwipeBillId}
        onToggleBillPaused={onToggleBillPaused}
      />
    );

    if (!showTutorialSwipeTarget) {
      return row;
    }

    return <TutorialTarget id="bills-row-swipe">{row}</TutorialTarget>;
  }

  return (
    <>
      <ScrollView
        ref={tutorialScrollRef}
        style={styles.content}
        contentContainerStyle={[styles.contentInner, styles.billsContentInner]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={onTutorialScroll}
        onScrollBeginDrag={() => setOpenSwipeBillId(null)}
      >
        <View style={styles.screenHeaderRow}>
          <View style={styles.itemCopy}>
            <Text style={styles.sectionTitle}>Bills</Text>
            <Text style={styles.helpText}>Saved bills and current-cycle obligations.</Text>
          </View>
          <TutorialTarget id="bills-add">
            <Pressable
              accessibilityHint="Opens the form to add a new bill"
              accessibilityLabel="Add bill"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.inlinePrimaryButton,
                pressed && styles.pressed,
              ]}
              onPress={onAddBill}
            >
              <Text style={styles.inlinePrimaryButtonText}>+ Add</Text>
            </Pressable>
          </TutorialTarget>
        </View>

        {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}

        {bills.length > 0 && (
          <BillCycleSummaryCard
            confirmCount={confirmCount}
            cycleLabel={cycleLabel}
            totalDueCents={totalDueCents}
          />
        )}

        {bills.length === 0 && (
          <TutorialTarget id="bills-due">
            <EmptyState
              title="No bills yet"
              body="Add upcoming bills to keep Safe to Spend grounded."
            />
          </TutorialTarget>
        )}

        {bills.length > 0 && (
          <TutorialTarget id="bills-due">
            <View style={styles.plainListGroup}>
              {currentCycleBills.length > 0 ? (
                <View style={styles.billListGroup}>
                  {currentCycleBills.map((bill, index) => (
                    <View key={bill.id}>
                      {renderBillRow(bill, index === 0)}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.billRowEmpty}>
                  <Text style={styles.helpText}>
                    No bills are assigned to this paycheck cycle yet.
                  </Text>
                </View>
              )}

              {scheduledBills.length > 0 && (
                <>
                  <Text style={styles.paycheckSectionTitle}>Scheduled bills</Text>
                  <View style={styles.billListGroup}>
                    {scheduledBills.map((bill) => (
                      <View key={bill.id}>{renderBillRow(bill)}</View>
                    ))}
                  </View>
                </>
              )}

              {pausedBills.length > 0 && (
                <>
                  <Pressable
                    accessibilityHint={
                      showPausedBills
                        ? "Collapses the paused bills list"
                        : "Expands the paused bills list"
                    }
                    accessibilityLabel="Paused bills"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.paycheckSectionToggle,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setShowPausedBills((isVisible) => !isVisible)}
                  >
                    <Text style={styles.paycheckCoverageTitle}>Paused bills</Text>
                    <Text style={styles.paycheckCoverageTotal}>
                      {pausedBills.length}{" "}
                      {pausedBills.length === 1 ? "bill" : "bills"}{" "}
                      {showPausedBills ? "⌃" : "⌄"}
                    </Text>
                  </Pressable>
                  {showPausedBills && (
                    <View style={styles.billListGroup}>
                      {pausedBills.map((bill) => (
                        <View key={bill.id}>{renderBillRow(bill)}</View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {paidBills.length > 0 && (
                <>
                  <Pressable
                    accessibilityHint={
                      showPaidBills
                        ? "Collapses the paid bills list"
                        : "Expands the paid bills list"
                    }
                    accessibilityLabel="Paid bills"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.paycheckSectionToggle,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setShowPaidBills((isVisible) => !isVisible)}
                  >
                    <Text style={styles.paycheckCoverageTitle}>Paid bills</Text>
                    <Text style={styles.paycheckCoverageTotal}>
                      {paidBills.length} {paidBills.length === 1 ? "bill" : "bills"}{" "}
                      {showPaidBills ? "⌃" : "⌄"}
                    </Text>
                  </Pressable>
                  {showPaidBills && (
                    <View style={styles.billListGroup}>
                      {paidBills.map((bill) => (
                        <View key={bill.id}>{renderBillRow(bill)}</View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </TutorialTarget>
        )}
      </ScrollView>
    </>
  );
}
