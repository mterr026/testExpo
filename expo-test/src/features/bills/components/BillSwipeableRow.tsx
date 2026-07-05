import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import {
  ActionMenu,
  money,
  StatusPill,
} from "@/shared/ui/components";
import { hapticForActionLabel, hapticSelection } from "@/shared/ui/haptics";
import {
  getSwipeRowActiveOffsetX,
  swipeRowGestureProps,
} from "@/shared/ui/swipeRowConfig";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { AppStyles } from "@/shared/ui/styles";
import { SwipeActionIcon } from "@/shared/ui/SwipeActionIcon";
import type { Bill } from "@/shared/ui/types";

import { getBillSwipeActions } from "../billActions";
import { getBillStatusPresentation } from "@/shared/ui/statusBadges";

import {
  formatBillDisplayName,
  formatBillDueDateParts,
  getBillRowMeta,
} from "../billRowDisplay";

type BillSwipeableRowProps = {
  bill: Bill;
  isGrouped?: boolean;
  isSwipeOpen: boolean;
  onConfirmBill: (bill: Bill) => void;
  onDeleteBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void | Promise<void>;
  onMarkUnpaid: (bill: Bill) => void | Promise<void>;
  onSwipeClose: () => void;
  onSwipeOpen: (billId: string) => void;
  onToggleBillPaused: (bill: Bill) => void;
};

export function BillSwipeableRow({
  bill,
  isGrouped = false,
  isSwipeOpen,
  onConfirmBill,
  onDeleteBill,
  onEditBill,
  onMarkPaid,
  onMarkUnpaid,
  onSwipeClose,
  onSwipeOpen,
  onToggleBillPaused,
}: BillSwipeableRowProps) {
  const styles = useStyles();
  const swipeableRef = useRef<Swipeable>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const dateParts = formatBillDueDateParts(bill.dueDate, bill.status);
  const isPaid = bill.status === "Paid";
  const isPaused = bill.status === "Paused" || bill.isPaused;
  const isProjected = bill.status === "Projected";
  const isDue = bill.status === "Due" || bill.status === "Needs confirmation";
  const isScheduled = bill.status === "Scheduled" || isProjected;
  const isUnpaidDue = isDue && !isPaused;
  const billStatus = getBillStatusPresentation(bill.status);
  const menuActions = getBillSwipeActions({
    bill,
    onConfirmBill,
    onDeleteBill,
    onEditBill,
    onMarkPaid,
    onMarkUnpaid,
    onToggleBillPaused,
  });
  const swipeActions = menuActions;

  useEffect(() => {
    if (isSwipeOpen) {
      swipeableRef.current?.openRight();
      return;
    }

    swipeableRef.current?.close();
  }, [isSwipeOpen]);

  const rowContent = (
    <View
      style={[
        styles.billRow,
        styles.billSwipeableRowForeground,
        isPaid && styles.billRowPaid,
        isPaused && styles.billRowPaused,
        isProjected && styles.billRowProjected,
      ]}
    >
      <View
        style={[
          styles.billDateBadge,
          isDue && styles.billDateBadgeDue,
          isPaid && styles.billDateBadgePaid,
          isScheduled && styles.billDateBadgeScheduled,
          isPaused && styles.billDateBadgePaused,
        ]}
      >
        {!!dateParts.month && (
          <Text
            style={[
              styles.billDateMonth,
              isDue && styles.billDateMonthDue,
            ]}
          >
            {dateParts.month}
          </Text>
        )}
        {!!dateParts.day && (
          <Text style={styles.billDateDay}>{dateParts.day}</Text>
        )}
      </View>

      <View style={styles.billRowMain}>
        <View style={styles.itemCopy}>
          <View style={styles.billTitleRow}>
            <Text
              ellipsizeMode="tail"
              numberOfLines={2}
              style={[styles.itemTitle, styles.billTitleText]}
            >
              {formatBillDisplayName(bill.name)}
            </Text>
            <StatusPill label={billStatus.label} tone={billStatus.tone} />
          </View>
          <Text numberOfLines={1} style={styles.billDueMeta}>
            {getBillRowMeta(bill)}
          </Text>
        </View>

        <View style={styles.billAmountColumn}>
          <Text
            style={[
              styles.billAmount,
              isPaid && styles.billAmountPaid,
              isUnpaidDue && styles.billAmountDue,
            ]}
          >
            {money(bill.amountCents)}
          </Text>
        </View>
      </View>
    </View>
  );

  function openActionMenu() {
    void hapticSelection();
    swipeableRef.current?.close();
    onSwipeClose();
    setMenuVisible(true);
  }

  function handleSwipeActionPress(action: (typeof swipeActions)[number]) {
    hapticForActionLabel(action.label);
    swipeableRef.current?.close();
    action.onPress();
  }

  const interactiveRow = (
    <Pressable
      accessibilityHint={
        isSwipeOpen
          ? "Closes bill actions"
          : "Long press for bill actions, swipe left for quick actions"
      }
      accessibilityRole="button"
      delayLongPress={400}
      onLongPress={isSwipeOpen ? undefined : openActionMenu}
      onPress={isSwipeOpen ? () => swipeableRef.current?.close() : undefined}
    >
      {rowContent}
    </Pressable>
  );

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        {...swipeRowGestureProps}
        activeOffsetX={getSwipeRowActiveOffsetX(isSwipeOpen)}
        containerStyle={
          isGrouped ? styles.billGroupedSwipeRow : styles.billSwipeableCard
        }
        onSwipeableClose={onSwipeClose}
        onSwipeableWillOpen={() => onSwipeOpen(bill.id)}
        renderRightActions={() => (
            <View style={styles.purchaseSwipeActions}>
              {swipeActions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  style={({ pressed }) => [
                    styles.purchaseSwipeAction,
                    getBillSwipeActionStyle(action.destructive, action.label, styles),
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSwipeActionPress(action)}
                >
                  {action.icon ? (
                    <SwipeActionIcon
                      destructive={action.destructive}
                      name={action.icon}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.purchaseSwipeActionLabel,
                      action.destructive && styles.purchaseSwipeActionLabelDestructive,
                    ]}
                    numberOfLines={2}
                  >
                    {getBillSwipeActionLabel(action.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        >
          {interactiveRow}
        </Swipeable>

      <ActionMenu
        header={{
          amount: money(bill.amountCents),
          meta: getBillRowMeta(bill),
          status: billStatus.label,
          statusTone: billStatus.tone,
          title: formatBillDisplayName(bill.name),
        }}
        title={formatBillDisplayName(bill.name)}
        visible={menuVisible}
        actions={menuActions}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

function getBillSwipeActionLabel(label: string) {
  if (label === "Confirm amount") {
    return "Confirm";
  }

  if (label === "Mark paid" || label === "Mark unpaid") {
    return label === "Mark paid" ? "Paid" : "Unpaid";
  }

  if (label === "Edit Bill") {
    return "Edit";
  }

  if (label === "Delete Bill") {
    return "Delete";
  }

  if (label === "Pause Recurring Bill") {
    return "Pause";
  }

  if (label === "Resume Recurring Bill") {
    return "Resume";
  }

  return label;
}

function getBillSwipeActionStyle(
  destructive: boolean | undefined,
  label: string,
  styles: AppStyles
) {
  if (destructive) {
    return styles.purchaseSwipeActionDestructive;
  }

  if (
    label === "Confirm amount" ||
    label === "Mark paid" ||
    label === "Mark unpaid"
  ) {
    return styles.purchaseSwipeActionAccent;
  }

  return styles.purchaseSwipeActionDefault;
}
