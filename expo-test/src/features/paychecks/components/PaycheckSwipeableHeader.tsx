import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { money, StatusPill } from "@/shared/ui/components";
import { getPaycheckStatusPresentation } from "@/shared/ui/statusBadges";
import { styles } from "@/shared/ui/styles";
import type { PaycheckListItem } from "@/shared/ui/types";

import { useSwipeRowGesture } from "@/features/home/SwipeRowGestureContext";

import { getPaycheckSwipeActions } from "../paycheckActions";

type PaycheckSwipeableHeaderProps = {
  amountStyle?: object;
  children?: ReactNode;
  isSwipeOpen: boolean;
  onConfirmPaycheck: (id: string) => void | Promise<void>;
  onDeletePaycheck: (id: string) => void | Promise<void>;
  onEditPaycheck: (paycheck: PaycheckListItem) => void;
  onMarkPaycheckUnreceived: (id: string) => void | Promise<void>;
  onSwipeClose: () => void;
  onSwipeOpen: (paycheckId: string) => void;
  paycheck: PaycheckListItem;
  rowInset?: "timeline" | "additional";
  showStatusPill?: boolean;
  variant?: "default" | "hero";
};

export function PaycheckSwipeableHeader({
  amountStyle,
  children,
  isSwipeOpen,
  onConfirmPaycheck,
  onDeletePaycheck,
  onEditPaycheck,
  onMarkPaycheckUnreceived,
  onSwipeClose,
  onSwipeOpen,
  paycheck,
  rowInset = "timeline",
  showStatusPill = true,
  variant = "default",
}: PaycheckSwipeableHeaderProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const setRowTouchActive = useSwipeRowGesture();
  const isAdditionalIncome = rowInset === "additional";
  const isHero = variant === "hero";
  const swipeActions = getPaycheckSwipeActions({
    paycheck,
    onConfirmPaycheck,
    onDeletePaycheck,
    onEditPaycheck,
    onMarkPaycheckUnreceived,
  });

  useEffect(() => {
    if (isSwipeOpen) {
      swipeableRef.current?.openRight();
      return;
    }

    swipeableRef.current?.close();
  }, [isSwipeOpen]);

  const paycheckStatus = getPaycheckStatusPresentation(paycheck.isReceived);
  const rowContent = isHero ? (
    <View style={styles.paycheckNextHeroSwipeForeground}>
      <View style={styles.paycheckNextHeroFocus}>
        <Text style={styles.paycheckNextHeroLabel}>Next Paycheck</Text>
        <Text style={styles.itemTitle}>{paycheck.label}</Text>
        {showStatusPill ? (
          <View style={styles.paycheckNextHeroStatusRow}>
            <StatusPill label={paycheckStatus.label} tone={paycheckStatus.tone} />
          </View>
        ) : null}
        <Text
          style={[
            styles.safeAmount,
            styles.paycheckNextHeroAmount,
            paycheck.isReceived && styles.paycheckAmountReceived,
          ]}
        >
          {money(paycheck.amountCents)}
        </Text>
      </View>
      {children}
    </View>
  ) : (
    <View
      style={[
        styles.paycheckSwipeableRowForeground,
        isAdditionalIncome && styles.paycheckSwipeableRowForegroundAdditional,
        isAdditionalIncome && !paycheck.isReceived
          ? styles.paycheckSwipeableRowForegroundRowSurface
          : null,
        !isAdditionalIncome && paycheck.isReceived
          ? styles.paycheckSwipeableRowForegroundRowSurface
          : null,
      ]}
    >
      <View style={styles.itemCopy}>
        {showStatusPill ? (
          <View style={styles.paycheckTitleRow}>
            <Text style={styles.itemTitle}>{paycheck.label}</Text>
            <StatusPill label={paycheckStatus.label} tone={paycheckStatus.tone} />
          </View>
        ) : (
          <Text style={styles.itemTitle}>{paycheck.label}</Text>
        )}
        {children}
      </View>
      <View style={styles.paycheckAmountColumn}>
        <Text
          style={[
            styles.paycheckAmount,
            amountStyle,
            paycheck.isReceived && styles.paycheckAmountReceived,
          ]}
        >
          {money(paycheck.amountCents)}
        </Text>
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
        containerStyle={
          isHero
            ? styles.paycheckNextHeroSwipeContainer
            : isAdditionalIncome
            ? styles.paycheckSwipeableContainerAdditional
            : styles.paycheckSwipeableContainer
        }
        onSwipeableClose={onSwipeClose}
        onSwipeableWillOpen={() => onSwipeOpen(paycheck.id)}
        renderRightActions={() => (
          <View style={styles.purchaseSwipeActions}>
            {swipeActions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.purchaseSwipeAction,
                  getPaycheckSwipeActionStyle(action.destructive, action.label),
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
                  {getPaycheckSwipeActionLabel(action.label)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      >
        {isSwipeOpen ? (
          <Pressable
            accessibilityHint="Closes paycheck actions"
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

function getPaycheckSwipeActionLabel(label: string) {
  if (label === "Confirm received") {
    return "Confirm";
  }

  if (label === "Mark unreceived") {
    return "Undo";
  }

  if (label === "Edit Paycheck") {
    return "Edit";
  }

  if (label === "Delete Paycheck" || label === "Delete Recurring Paychecks") {
    return "Delete";
  }

  return label;
}

function getPaycheckSwipeActionStyle(destructive: boolean | undefined, label: string) {
  if (destructive) {
    return styles.purchaseSwipeActionDestructive;
  }

  if (label === "Confirm received" || label === "Mark unreceived") {
    return styles.purchaseSwipeActionAccent;
  }

  return styles.purchaseSwipeActionDefault;
}
