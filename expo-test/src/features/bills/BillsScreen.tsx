import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  ActionMenu,
  EmptyState,
  money,
  OverflowButton,
  StatusPill,
  type ActionMenuHeader,
  type ActionMenuItem,
  type StatusPillTone,
} from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { Bill } from "@/shared/ui/types";

export function BillsScreen({
  bills,
  cycleLabel,
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
  bills: Bill[];
  cycleLabel: string;
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
  const currentCycleBills = bills.filter(
    (bill) => bill.status !== "Scheduled" && bill.status !== "Paid"
  );
  const paidBills = bills.filter((bill) => bill.status === "Paid");
  const scheduledBills = bills.filter((bill) => bill.status === "Scheduled");
  const [showPaidBills, setShowPaidBills] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (!openActionMenuForBillId) {
      return;
    }

    const bill = bills.find((candidate) => candidate.id === openActionMenuForBillId);

    if (!bill) {
      return;
    }

    setSelectedBill(bill);
    onClearOpenActionMenuTarget?.();
  }, [bills, onClearOpenActionMenuTarget, openActionMenuForBillId]);

  const billActions = selectedBill
    ? getBillActions({
        bill: selectedBill,
        onConfirmBill,
        onDeleteBill,
        onEditBill,
        onMarkPaid,
        onMarkUnpaid,
        onToggleBillPaused,
      })
    : [];

  return (
    <>
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.screenHeaderRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.sectionTitle}>Bills</Text>
          <Text style={styles.helpText}>Saved bills and current-cycle obligations.</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.inlinePrimaryButton,
            pressed && styles.pressed,
          ]}
          onPress={onAddBill}
        >
          <Text style={styles.inlinePrimaryButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {bills.length === 0 && (
        <EmptyState title="No bills yet" body="Add upcoming bills to keep Safe to Spend grounded." />
      )}

      {bills.length > 0 && (
        <View style={styles.plainListGroup}>
          <View style={styles.listSectionHeader}>
            <Text style={styles.settingsGroupTitle}>Due this cycle</Text>
            <Text style={styles.rowMetaText}>{cycleLabel}</Text>
          </View>
          {currentCycleBills.length > 0 ? (
            currentCycleBills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onOpenActions={setSelectedBill}
              />
            ))
          ) : (
            <View style={styles.billRowEmpty}>
              <Text style={styles.helpText}>
                No bills are assigned to this paycheck cycle yet.
              </Text>
            </View>
          )}

          {scheduledBills.length > 0 && (
            <>
              <View style={styles.listSectionHeader}>
                <Text style={styles.settingsGroupTitle}>Scheduled bills</Text>
              </View>
              {scheduledBills.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  onOpenActions={setSelectedBill}
                />
              ))}
            </>
          )}

          {paidBills.length > 0 && (
            <>
              <Pressable
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
              {showPaidBills &&
                paidBills.map((bill) => (
                  <BillRow
                    key={bill.id}
                    bill={bill}
                    onOpenActions={setSelectedBill}
                  />
                ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
    <ActionMenu
      header={selectedBill ? getBillActionHeader(selectedBill) : undefined}
      title={selectedBill?.name ?? "Bill"}
      visible={!!selectedBill}
      actions={billActions}
      onClose={() => setSelectedBill(null)}
    />
    </>
  );
}

function BillRow({
  bill,
  onOpenActions,
}: {
  bill: Bill;
  onOpenActions: (bill: Bill) => void;
}) {
  const dateParts = formatBillDueDateParts(bill.dueDate);
  const isPaid = bill.status === "Paid";

  return (
    <View style={[styles.billRow, isPaid && styles.billRowPaid]}>
      <View style={styles.billDateBadge}>
        <Text style={styles.billDateMonth}>{dateParts.month}</Text>
        <Text style={styles.billDateDay}>{dateParts.day}</Text>
      </View>

      <View style={styles.billRowMain}>
        <View style={styles.itemCopy}>
          <View style={styles.billTitleRow}>
            <Text style={styles.itemTitle}>{bill.name}</Text>
            <StatusPill label={bill.status} tone={getBillStatusTone(bill.status)} />
          </View>
          <Text style={styles.billDueMeta}>
            Due {formatBillDisplayDate(bill.dueDate)}
          </Text>
        </View>

        <View style={styles.billAmountColumn}>
          <Text style={[styles.billAmount, isPaid && styles.billAmountPaid]}>
            {money(bill.amountCents)}
          </Text>
          <OverflowButton onPress={() => onOpenActions(bill)} />
        </View>
      </View>
    </View>
  );
}

function getBillActionHeader(bill: Bill): ActionMenuHeader {
  return {
    amount: money(bill.amountCents),
    meta: `Due ${formatBillDisplayDate(bill.dueDate)}`,
    status: bill.billId ? "Recurring Bill" : "One-Time Bill",
    statusTone: bill.billId ? "accent" : "muted",
    title: bill.name,
  };
}

function getBillStatusTone(status: Bill["status"]): StatusPillTone {
  switch (status) {
    case "Due":
      return "accent";
    case "Paid":
      return "neutral";
    case "Needs confirmation":
      return "warning";
    case "Paused":
      return "warm";
    case "Scheduled":
      return "muted";
    case "Projected":
      return "muted";
  }
}

function getBillActions({
  bill,
  onConfirmBill,
  onDeleteBill,
  onEditBill,
  onMarkPaid,
  onMarkUnpaid,
  onToggleBillPaused,
}: {
  bill: Bill;
  onConfirmBill: (bill: Bill) => void;
  onDeleteBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void | Promise<void>;
  onMarkUnpaid: (bill: Bill) => void | Promise<void>;
  onToggleBillPaused: (bill: Bill) => void;
}): ActionMenuItem[] {
  const primaryActions: ActionMenuItem[] = [];

  if (bill.status === "Needs confirmation" && !bill.isPaused) {
    primaryActions.push({
      icon: "$",
      label: "Confirm amount",
      closeBeforeAction: true,
      onPress: () => onConfirmBill(bill),
    });
  }

  if (
    (bill.status === "Due" || bill.status === "Scheduled") &&
    !bill.isPaused
  ) {
    primaryActions.push({
      icon: "✓",
      label: "Mark paid",
      closeBeforeAction: true,
      onPress: () => {
        void onMarkPaid(bill);
      },
    });
  }

  if (bill.status === "Paid") {
    primaryActions.push({
      icon: "↩",
      label: "Mark unpaid",
      closeBeforeAction: true,
      onPress: () => {
        void onMarkUnpaid(bill);
      },
    });
  }

  return [
    ...primaryActions,
    {
      icon: "✏️",
      label: "Edit Bill",
      closeBeforeAction: true,
      onPress: () => onEditBill(bill),
    },
    ...(bill.billId
      ? [
          {
            icon: bill.isPaused ? "▶️" : "⏸",
            label: bill.isPaused
              ? "Resume Recurring Bill"
              : "Pause Recurring Bill",
            closeBeforeAction: true,
            onPress: () => {
              void onToggleBillPaused(bill);
            },
          } as ActionMenuItem,
        ]
      : []),
    {
      icon: "🗑",
      label: "Delete Bill",
      destructive: true,
      closeBeforeAction: true,
      onPress: () => {
        void onDeleteBill(bill);
      },
    },
  ];
}

function formatBillDueDateParts(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { day: "—", month: "" };
  }

  const [, month, day] = date.split("-");

  return {
    day: String(Number(day)),
    month: formatMonth(Number(month)),
  };
}

function formatBillDisplayDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
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
