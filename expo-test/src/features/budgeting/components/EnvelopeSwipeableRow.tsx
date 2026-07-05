import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import type { Envelope } from "@/database/repositories/types";
import type { EnvelopeSnapshotEntry } from "@/engine";
import { ActionMenu, money } from "@/shared/ui/components";
import { hapticForActionLabel, hapticSelection } from "@/shared/ui/haptics";
import { SwipeActionIcon } from "@/shared/ui/SwipeActionIcon";
import {
  getSwipeRowActiveOffsetX,
  swipeRowGestureProps,
} from "@/shared/ui/swipeRowConfig";
import { useStyles } from "@/shared/ui/ThemeContext";

import {
  getEnvelopeSwipeActionLabel,
  getEnvelopeSwipeActionStyle,
  getEnvelopeSwipeActions,
} from "../envelopeActions";

type EnvelopeSwipeableRowProps = {
  envelope: Envelope;
  envelopeEntry?: EnvelopeSnapshotEntry;
  isSwipeOpen: boolean;
  onDeleteEnvelope: (id: string) => void | Promise<void>;
  onEditEnvelope: (envelope: Envelope) => void;
  onSwipeClose: () => void;
  onSwipeOpen: (envelopeId: string) => void;
  onToggleEnvelopePaused: (envelope: Envelope) => void | Promise<void>;
};

export function EnvelopeSwipeableRow({
  envelope,
  envelopeEntry,
  isSwipeOpen,
  onDeleteEnvelope,
  onEditEnvelope,
  onSwipeClose,
  onSwipeOpen,
  onToggleEnvelopePaused,
}: EnvelopeSwipeableRowProps) {
  const styles = useStyles();
  const swipeableRef = useRef<Swipeable>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const remainingCents = envelopeEntry?.remainingCents ?? envelope.allocationCents;
  const spentCents = envelopeEntry?.spentCents ?? 0;
  const menuActions = getEnvelopeSwipeActions({
    envelope,
    onDeleteEnvelope,
    onEditEnvelope,
    onToggleEnvelopePaused,
  });
  const swipeActions = menuActions;

  useEffect(() => {
    if (!isSwipeOpen) {
      swipeableRef.current?.close();
    }
  }, [isSwipeOpen]);

  const rowContent = (
    <View
      style={[
        styles.purchaseTransactionRow,
        styles.envelopeSwipeableRowForeground,
      ]}
    >
      <View style={styles.itemCopy}>
        <Text style={styles.transactionTitle}>
          {envelope.name}
          {envelope.isPaused ? " (Paused)" : ""}
        </Text>
        <Text style={styles.rowMetaText}>
          {money(spentCents)} spent of {money(envelope.allocationCents)}
        </Text>
      </View>
      <Text style={styles.transactionAmount}>{money(remainingCents)} left</Text>
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
          ? "Closes envelope actions"
          : "Long press for envelope actions, swipe left for quick actions"
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
        containerStyle={styles.envelopeSwipeableCard}
        onSwipeableClose={onSwipeClose}
        onSwipeableWillOpen={() => onSwipeOpen(envelope.id)}
        renderRightActions={() => (
            <View style={styles.purchaseSwipeActions}>
              {swipeActions.map((action) => {
                const actionStyle = getEnvelopeSwipeActionStyle(
                  action.destructive,
                  action.label
                );

                return (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    style={({ pressed }) => [
                      styles.purchaseSwipeAction,
                      actionStyle === "destructive"
                        ? styles.purchaseSwipeActionDestructive
                        : actionStyle === "accent"
                          ? styles.purchaseSwipeActionAccent
                          : styles.purchaseSwipeActionDefault,
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
                        action.destructive &&
                          styles.purchaseSwipeActionLabelDestructive,
                      ]}
                      numberOfLines={2}
                    >
                      {getEnvelopeSwipeActionLabel(action.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        >
          {interactiveRow}
        </Swipeable>

      <ActionMenu
        header={{
          amount: money(remainingCents),
          meta: `${money(spentCents)} spent of ${money(envelope.allocationCents)}`,
          status: envelope.isPaused ? "Paused" : "Active",
          statusTone: envelope.isPaused ? "muted" : "accent",
          title: envelope.name,
        }}
        title={envelope.name}
        visible={menuVisible}
        actions={menuActions}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}
