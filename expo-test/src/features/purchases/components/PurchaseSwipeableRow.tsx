import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { getPurchaseStatusPresentation } from "@/shared/ui/statusBadges";
import { money, StatusPill } from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";
import type { Purchase } from "@/shared/ui/types";

import { useSwipeRowGesture } from "@/features/home/SwipeRowGestureContext";
import { getPurchaseSwipeActions } from "../purchaseActions";
import { formatPurchaseDisplayName } from "../purchaseRowDisplay";

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
  const swipeableRef = useRef<Swipeable>(null);
  const setRowTouchActive = useSwipeRowGesture();
  const isPending = purchase.status === "Pending";
  const isCharged = purchase.status === "Charged";
  const purchaseStatus = getPurchaseStatusPresentation(purchase.status);
  const swipeActions = getPurchaseSwipeActions({
    purchase,
    onDeletePurchase,
    onEditPurchase,
    onMarkCharged,
    onMarkPending,
  });

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

  function handleRowTouchStart() {
    setRowTouchActive?.(true);
  }

  function handleRowTouchEnd() {
    setRowTouchActive?.(false);
  }

  return (
    <View
      onTouchCancel={handleRowTouchEnd}
      onTouchEnd={handleRowTouchEnd}
      onTouchStart={handleRowTouchStart}
    >
      <Swipeable
        ref={swipeableRef}
        activeOffsetX={isSwipeOpen ? [-10000, 12] : [-12, 10000]}
        failOffsetY={[-16, 16]}
        friction={2}
        overshootFriction={8}
        overshootRight={false}
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
                  getPurchaseSwipeActionStyle(action.destructive, action.label),
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  swipeableRef.current?.close();
                  action.onPress();
                }}
              >
                <Text style={styles.purchaseSwipeActionIcon}>{action.icon}</Text>
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
        {isSwipeOpen ? (
          <Pressable
            accessibilityHint="Closes purchase actions"
            accessibilityRole="button"
            onPress={() => swipeableRef.current?.close()}
          >
            {rowContent}
          </Pressable>
        ) : (
          rowContent
        )}
      </Swipeable>
    </View>
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

function getPurchaseSwipeActionStyle(destructive: boolean | undefined, label: string) {
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
