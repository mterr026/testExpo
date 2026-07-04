import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

import type { Envelope } from "@/database/repositories/types";
import type { EnvelopeSnapshotEntry } from "@/engine";
import { money } from "@/shared/ui/components";
import { styles } from "@/shared/ui/styles";

import { useSwipeRowGesture } from "@/features/home/SwipeRowGestureContext";

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
  const swipeableRef = useRef<Swipeable>(null);
  const setRowTouchActive = useSwipeRowGesture();
  const remainingCents = envelopeEntry?.remainingCents ?? envelope.allocationCents;
  const spentCents = envelopeEntry?.spentCents ?? 0;
  const swipeActions = getEnvelopeSwipeActions({
    envelope,
    onDeleteEnvelope,
    onEditEnvelope,
    onToggleEnvelopePaused,
  });

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
                  onPress={() => {
                    swipeableRef.current?.close();
                    action.onPress();
                  }}
                >
                  <Text style={styles.purchaseSwipeActionIcon}>{action.icon}</Text>
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
        {isSwipeOpen ? (
          <Pressable
            accessibilityHint="Closes envelope actions"
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
