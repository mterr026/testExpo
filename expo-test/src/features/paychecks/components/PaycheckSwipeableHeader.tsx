import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { ActionMenu, money, StatusPill } from "@/shared/ui/components";
import { hapticForActionLabel, hapticSelection } from "@/shared/ui/haptics";
import {
  getSwipeRowActiveOffsetX,
  swipeRowGestureProps,
} from "@/shared/ui/swipeRowConfig";
import { SwipeActionIcon } from "@/shared/ui/SwipeActionIcon";
import { getPaycheckStatusPresentation } from "@/shared/ui/statusBadges";
import { useStyles } from "@/shared/ui/ThemeContext";
import type { AppStyles } from "@/shared/ui/styles";
import type { PaycheckListItem } from "@/shared/ui/types";

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
  const styles = useStyles();
  const swipeableRef = useRef<Swipeable>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const isAdditionalIncome = rowInset === "additional";
  const isHero = variant === "hero";
  const menuActions = getPaycheckSwipeActions({
    paycheck,
    onConfirmPaycheck,
    onDeletePaycheck,
    onEditPaycheck,
    onMarkPaycheckUnreceived,
  });
  const swipeActions = menuActions;

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
          ? "Closes paycheck actions"
          : "Long press for paycheck actions, swipe left for quick actions"
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
                    getPaycheckSwipeActionStyle(action.destructive, action.label, styles),
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
                    {getPaycheckSwipeActionLabel(action.label)}
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
          amount: money(paycheck.amountCents),
          meta: paycheck.expectedDate,
          status: paycheckStatus.label,
          statusTone: paycheckStatus.tone,
          title: paycheck.label,
        }}
        title={paycheck.label}
        visible={menuVisible}
        actions={menuActions}
        onClose={() => setMenuVisible(false)}
      />
    </>
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

function getPaycheckSwipeActionStyle(
  destructive: boolean | undefined,
  label: string,
  styles: AppStyles
) {
  if (destructive) {
    return styles.purchaseSwipeActionDestructive;
  }

  if (label === "Confirm received" || label === "Mark unreceived") {
    return styles.purchaseSwipeActionAccent;
  }

  return styles.purchaseSwipeActionDefault;
}
