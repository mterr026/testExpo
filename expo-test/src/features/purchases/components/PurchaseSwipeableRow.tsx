import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { ActionMenu, money, StatusPill } from "@/shared/ui/components";
import { hapticForActionLabel, hapticSelection } from "@/shared/ui/haptics";
import { getPurchaseStatusPresentation } from "@/shared/ui/statusBadges";
import { SwipeActionIcon } from "@/shared/ui/SwipeActionIcon";
import {
  getSwipeRowActiveOffsetX,
  swipeRowGestureProps,
} from "@/shared/ui/swipeRowConfig";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { AppStyles } from "@/shared/ui/styles";
import type { Purchase } from "@/shared/ui/types";

import { getPurchaseSwipeActions } from "../purchaseActions";
import { getPurchaseRowMeta, formatPurchaseDisplayName } from "../purchaseRowDisplay";

type PurchaseSwipeableRowProps = {
  isSwipeOpen: boolean;
  onDeletePurchase: (id: string) => void | Promise<void>;
  onEditPurchase: (purchase: Purchase) => void;
  onMarkCharged: (id: string) => void | Promise<void>;
  onMarkPending: (id: string) => void | Promise<void>;
  onSwipeClose: () => void;
  onSwipeOpen: (purchaseId: string) => void;
  purchase: Purchase;
};

export function PurchaseSwipeableRow({
  isSwipeOpen,
  onDeletePurchase,
  onEditPurchase,
  onMarkCharged,
  onMarkPending,
  onSwipeClose,
  onSwipeOpen,
  purchase,
}: PurchaseSwipeableRowProps) {
  const styles = useStyles();
  const swipeableRef = useRef<Swipeable>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const isPending = purchase.status === "Pending";
  const isCharged = purchase.status === "Charged";
  const purchaseStatus = getPurchaseStatusPresentation(purchase.status);
  const menuActions = getPurchaseSwipeActions({
    purchase,
    onDeletePurchase,
    onEditPurchase,
    onMarkCharged,
    onMarkPending,
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
    <View style={[styles.purchaseTransactionRow, styles.purchaseSwipeableRowForeground]}>
      <View style={styles.purchaseRowMain}>
        <View style={styles.itemCopy}>
          <View style={styles.purchaseTitleRow}>
            <Text
              ellipsizeMode="tail"
              numberOfLines={2}
              style={[styles.itemTitle, styles.purchaseTitleText]}
            >
              {formatPurchaseDisplayName(purchase.name)}
            </Text>
            <StatusPill label={purchaseStatus.label} tone={purchaseStatus.tone} />
          </View>
          <Text numberOfLines={1} style={styles.billDueMeta}>
            {getPurchaseRowMeta(purchase)}
          </Text>
        </View>

        <View style={styles.purchaseAmountColumn}>
          <Text
            style={[
              styles.purchaseAmount,
              isPending && styles.purchaseAmountPending,
              isCharged && styles.purchaseAmountCharged,
            ]}
          >
            -{money(normalizePurchaseAmountCents(purchase.amountCents))}
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
          ? "Closes purchase actions"
          : "Long press for purchase actions, swipe left for quick actions"
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
        containerStyle={styles.purchaseSwipeableCard}
        onSwipeableClose={onSwipeClose}
        onSwipeableWillOpen={() => onSwipeOpen(purchase.id)}
        renderRightActions={() => (
            <View style={styles.purchaseSwipeActions}>
              {swipeActions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  style={({ pressed }) => [
                    styles.purchaseSwipeAction,
                    getPurchaseSwipeActionStyle(action.destructive, action.label, styles),
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSwipeActionPress(action)}
                >
                  <SwipeActionIcon
                    destructive={action.destructive}
                    name={action.icon ?? "pencil"}
                  />
                  <Text
                    style={[
                      styles.purchaseSwipeActionLabel,
                      action.destructive && styles.purchaseSwipeActionLabelDestructive,
                    ]}
                    numberOfLines={2}
                  >
                    {getPurchaseSwipeActionLabel(action.label)}
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
          amount: `-${money(normalizePurchaseAmountCents(purchase.amountCents))}`,
          meta: getPurchaseRowMeta(purchase),
          status: purchaseStatus.label,
          statusTone: purchaseStatus.tone,
          title: formatPurchaseDisplayName(purchase.name),
        }}
        title={formatPurchaseDisplayName(purchase.name)}
        visible={menuVisible}
        actions={menuActions}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

function getPurchaseSwipeActionLabel(label: string) {
  if (label === "Mark Charged") {
    return "Charged";
  }

  if (label === "Mark Pending") {
    return "Pending";
  }

  if (label === "Edit Purchase") {
    return "Edit";
  }

  if (label === "Delete Purchase") {
    return "Delete";
  }

  return label;
}

function getPurchaseSwipeActionStyle(
  destructive: boolean | undefined,
  label: string,
  styles: AppStyles
) {
  if (destructive) {
    return styles.purchaseSwipeActionDestructive;
  }

  if (label === "Mark Charged" || label === "Mark Pending") {
    return styles.purchaseSwipeActionAccent;
  }

  return styles.purchaseSwipeActionDefault;
}

function normalizePurchaseAmountCents(amountCents: number | null | undefined): number {
  return typeof amountCents === "number" && Number.isInteger(amountCents)
    ? amountCents
    : 0;
}
